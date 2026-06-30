import { rankingConfig, selectionConfig, isFamousVenue } from "@eventi/config";
import {
  dedupeEvents,
  selectEvents,
  withHypeScore,
  withinRadius,
  withinWindow,
  type Event,
  type GeoQuery,
  type RawEvent,
} from "@eventi/core";
import { reverseGeocodeCity } from "./geocode";
import { MockSource } from "./mock-events";
import { getEventSources } from "./registry";
import { enrichWithSpotify } from "./spotify";
import { enrichWithPredictHQ } from "./stubs/predicthq";

export type PipelineResult = {
  /** candidati grezzi (somma di tutte le fonti, pre-dedup) */
  rawCount: number;
  /** dopo dedup (pre-filtro) */
  dedupedCount: number;
  /** lista finale rankata + filtrata (filtro adattivo applicato) */
  events: Event[];
  /** fonti effettivamente interrogate */
  sources: string[];
  /** fonti che hanno fallito (per debug, non bloccano il resto) */
  failed: string[];
  /** true se si e' usato il fallback alle fixture mock (zero chiavi / nessun dato) */
  usedMock: boolean;
};

/**
 * Pipeline completo Fase 1:
 *   fonti (parallele, error-tolerant) -> filtro geo/finestra -> dedup
 *   -> enrich Spotify -> enrich PredictHQ (stub) -> hypeScore -> filtro adattivo
 */
export async function runPipeline(query: GeoQuery): Promise<PipelineResult> {
  // 0. se manca la citta' (es. "usa la mia posizione"), reverse-geocode da
  // lat/lng: SerpApi/RA cercano per citta', non per coordinate.
  let q = query;
  if (!q.cityLabel) {
    const city = await reverseGeocodeCity(q.lat, q.lng);
    if (city) q = { ...q, cityLabel: city };
  }

  const sources = getEventSources();
  const failed: string[] = [];

  // 1. fetch parallelo, error-tolerant: una fonte ko non butta giu' le altre
  const results = await Promise.all(
    sources.map(async (s) => {
      try {
        return await s.fetchEvents(q);
      } catch (err) {
        failed.push(s.id);
        console.warn(`[pipeline] fonte ${s.id} fallita: ${(err as Error).message}`);
        return [] as RawEvent[];
      }
    }),
  );

  let raws = results.flat();

  // 1b. fallback fixture mock: se nessuna fonte reale ha dato eventi (es. zero
  // chiavi) o se forzato, usiamo dati finti realistici. Mai schermo vuoto/crash.
  const forceMock = process.env.EVENT_SOURCE_MOCK === "1";
  const usedMock = forceMock || raws.length === 0;
  if (usedMock) {
    raws = await new MockSource().fetchEvents(q);
  }

  // 2. filtro raggio + finestra temporale (eventi senza coord vengono tenuti)
  const inScope = raws.filter(
    (r) =>
      withinRadius({ lat: q.lat, lng: q.lng }, r.venue, q.radiusKm) &&
      withinWindow(r.start, q.from, q.to),
  );

  // 3. dedup/merge cross-fonte
  const deduped = dedupeEvents(inScope);

  // 4. arricchimento segnali (Spotify obbligatorio se configurato, PredictHQ stub)
  const enriched = await enrichWithPredictHQ(await enrichWithSpotify(deduped));

  // 5. hypeScore
  const ranked = enriched.map((e) => withHypeScore(e, rankingConfig));

  // 6. filtro adattivo alla densita'
  const selected = selectEvents(ranked, {
    ...selectionConfig,
    isFamous: isFamousVenue,
  });

  return {
    rawCount: raws.length,
    dedupedCount: deduped.length,
    events: selected,
    sources: usedMock ? ["mock"] : sources.map((s) => s.id),
    failed,
    usedMock,
  };
}
