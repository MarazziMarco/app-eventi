import type { EventSource, GeoQuery, RawEvent } from "@eventi/core";

/**
 * STUB Fase 2 — Resident Advisor (nightlife/club).
 * RA espone una GraphQL non ufficiale. Da implementare quando si vuole
 * coprire il mondo club/techno. Per ora disattivato (isConfigured=false).
 */
export class ResidentAdvisorSource implements EventSource {
  readonly id = "resident_advisor";

  isConfigured(): boolean {
    return false; // TODO Fase 2
  }

  async fetchEvents(_q: GeoQuery): Promise<RawEvent[]> {
    return [];
  }
}
