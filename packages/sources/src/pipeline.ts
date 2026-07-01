import { rankingConfig, selectionConfig, isFamousVenue, nearbyCities } from "@eventi/config";
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
import { enrichWithDeezer } from "./deezer";
import { MockSource } from "./mock-events";
import { getEventSources } from "./registry";
import { enrichWithSpotify, isSpotifyConfigured } from "./spotify";
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
  const sources = getEventSources();
  const failed: string[] = [];

  // interroga TUTTE le fonti per una città, error-tolerant
  const fetchCity = async (cq: GeoQuery): Promise<RawEvent[]> => {
    const r = await Promise.all(
      sources.map(async (s) => {
        try {
          return await s.fetchEvents(cq);
        } catch (err) {
          failed.push(s.id);
          console.warn(`[pipeline] fonte ${s.id} (${cq.cityLabel}) fallita: ${(err as Error).message}`);
          return [] as RawEvent[];
        }
      }),
    );
    return r.flat();
  };

  // 0/1. città target:
  //  - preset (cityLabel fornito): solo quella città.
  //  - "usa la mia posizione" (no cityLabel): il comune (reverse-geocode) +
  //    le città dell'elenco entro il raggio scelto. Cosi' il "raggio" significa
  //    davvero "centri vicini entro X km".
  let raws: RawEvent[];
  if (query.cityLabel) {
    raws = await fetchCity(query);
  } else {
    const town = await reverseGeocodeCity(query.lat, query.lng);
    const near = nearbyCities(query.lat, query.lng, query.radiusKm, 5);
    const cities = [...new Set([town, ...near].filter((c): c is string => Boolean(c)))];
    const perCity = await Promise.all(cities.map((c) => fetchCity({ ...query, cityLabel: c })));
    raws = perCity.flat();
  }

  const q = query;

  // 1b. fixture mock SOLO se esplicitamente richiesto (EVENT_SOURCE_MOCK=1, per
  // demo/dev offline). In produzione NON facciamo fallback automatico: meglio
  // uno schermo "nessun evento" che eventi finti con link morti.
  const usedMock = process.env.EVENT_SOURCE_MOCK === "1";
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

  // 4. arricchimento popolarità artista: Spotify se configurato (ora richiede
  // Premium), altrimenti Deezer (gratis, senza chiave). Poi PredictHQ (stub).
  const withPop = isSpotifyConfigured()
    ? await enrichWithSpotify(deduped)
    : await enrichWithDeezer(deduped);

  // ri-classifica: se un evento "other" ha un artista con popolarita' alta
  // (match musicale forte su Deezer), e' un concerto -> corregge la categoria.
  const reclassified = withPop.map((e) =>
    e.category === "other" && (e.artist?.spotifyPopularity ?? 0) >= 55
      ? { ...e, category: "concert" as const }
      : e,
  );

  const enriched = await enrichWithPredictHQ(reclassified);

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
    failed: [...new Set(failed)],
    usedMock,
  };
}
