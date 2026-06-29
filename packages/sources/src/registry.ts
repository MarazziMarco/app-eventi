import type { EventSource } from "@eventi/core";
import { GoogleEventsScraperSource } from "./google-events-scraper";
import { GoogleEventsSerpApiSource } from "./google-events-serpapi";
import { ResidentAdvisorSource } from "./resident-advisor";
import { DiceSource } from "./stubs/dice";
import { TicketmasterSource } from "./ticketmaster";

/** Override opzionale per forzare UNA sola fonte IT (debug). */
export type ItSourceMode = "serpapi" | "scraper";

export function itSourceOverride(): ItSourceMode | undefined {
  const v = process.env.EVENT_SOURCE_IT;
  return v === "serpapi" || v === "scraper" ? v : undefined;
}

/**
 * Tutte le fonti configurate girano INSIEME (il dedup le fonde):
 *   - Ticketmaster (se TICKETMASTER_KEY)
 *   - copertura IT: SerpApi (se key) + scraper, oppure solo quella forzata
 *     da EVENT_SOURCE_IT
 *   - Resident Advisor (nightlife; off con RA_ENABLED=0)
 *   - stub Fase 2 (DICE) inclusi ma disattivati
 *
 * Filtra fuori cio' che non e' configurato: gira anche con UNA sola fonte.
 */
export function getEventSources(): EventSource[] {
  const override = itSourceOverride();
  const itSources: EventSource[] =
    override === "serpapi"
      ? [new GoogleEventsSerpApiSource()]
      : override === "scraper"
        ? [new GoogleEventsScraperSource()]
        : [new GoogleEventsSerpApiSource(), new GoogleEventsScraperSource()];

  const all: EventSource[] = [
    new TicketmasterSource(),
    ...itSources,
    new ResidentAdvisorSource(),
    new DiceSource(),
  ];

  return all.filter((s) => s.isConfigured());
}
