import type { EventSource, GeoQuery, RawEvent } from "@eventi/core";

/**
 * STUB Fase 2 — DICE (concerti/club, forte su nightlife indie).
 * DICE non ha API pubblica ufficiale: valutare partnership o scraping.
 * Per ora disattivato.
 */
export class DiceSource implements EventSource {
  readonly id = "dice";

  isConfigured(): boolean {
    return false; // TODO Fase 2
  }

  async fetchEvents(_q: GeoQuery): Promise<RawEvent[]> {
    return [];
  }
}
