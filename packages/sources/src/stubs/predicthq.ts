import type { Event } from "@eventi/core";

/**
 * STUB Fase 2 — PredictHQ.
 * NON e' una fonte eventi qui: fornisce un "Local Rank" (0-100) che, se
 * presente, fa override/blend dell'hypeScore (vedi computeHypeScore).
 * Quando avrai PREDICTHQ_TOKEN, implementa enrichWithPredictHQ() per
 * popolare event.externalRank cercando per (titolo, data, geo).
 */

export function isPredictHqConfigured(): boolean {
  return Boolean(process.env.PREDICTHQ_TOKEN);
}

/**
 * Placeholder: oggi ritorna gli eventi invariati.
 * Fase 2: chiamare /v1/events con location+date, leggere `local_rank`,
 * settare event.externalRank.
 */
export async function enrichWithPredictHQ(events: Event[]): Promise<Event[]> {
  if (!isPredictHqConfigured()) return events;
  // TODO Fase 2: fetch local_rank e set externalRank
  return events;
}
