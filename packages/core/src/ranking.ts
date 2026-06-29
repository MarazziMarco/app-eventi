import type { Event, RankingConfig, RawEvent } from "./types";

/**
 * hypeScore (0-100). Combina segnali pesati, ciascuno normalizzato a 0..1.
 *
 *   capacity   -> capacityTier del venue (stadio=3 ... piccolo=0)
 *   artist     -> popolarita' Spotify dell'artista (solo eventi musicali)
 *   category   -> peso categoria (festival/sport > generico)
 *   demand     -> n. di ticket source + flag sold-out (proxy di domanda)
 *
 * Trasparenza: lo score finale e' la media pesata dei soli segnali
 * APPLICABILI. Se l'evento non e' musicale (niente artista), il peso
 * `artistPopularity` viene escluso dal denominatore invece di penalizzare:
 * cosi' uno stadio sold-out di calcio non perde punti per non avere Spotify.
 *
 * Se externalRank (PredictHQ) e' presente, blend finale via externalRankBlend.
 */
export function computeHypeScore(
  ev: Pick<
    Event,
    "category" | "venue" | "artist" | "ticketSources" | "soldOut" | "externalRank"
  >,
  cfg: RankingConfig,
): number {
  const w = cfg.weights;

  const tier = ev.venue.capacityTier ?? 0;
  const capacitySignal = cfg.capacityTierScore[tier];

  const categorySignal = cfg.categoryWeight[ev.category];

  // domanda: 0..1 da n. ticket source (satura a 3) + bonus sold-out
  const nTickets = ev.ticketSources?.length ?? 0;
  let demandSignal = Math.min(nTickets / 3, 1) * 0.7;
  if (ev.soldOut) demandSignal = Math.min(1, demandSignal + 0.3);

  let contrib = w.capacity * capacitySignal + w.category * categorySignal + w.demand * demandSignal;
  let denom = w.capacity + w.category + w.demand;

  const pop = ev.artist?.spotifyPopularity;
  if (typeof pop === "number") {
    contrib += w.artistPopularity * (pop / 100);
    denom += w.artistPopularity;
  }

  const score01 = denom > 0 ? contrib / denom : 0;
  let hype = Math.round(score01 * 100);

  // Blend con PredictHQ Local Rank quando presente.
  if (typeof ev.externalRank === "number") {
    const b = cfg.externalRankBlend;
    hype = Math.round((1 - b) * hype + b * ev.externalRank);
  }

  return clamp(hype, 0, 100);
}

/** Applica hypeScore + id + sources a un evento gia' deduplicato. */
export function withHypeScore(ev: Event, cfg: RankingConfig): Event {
  return { ...ev, hypeScore: computeHypeScore(ev, cfg) };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export type { RawEvent };
