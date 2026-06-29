import type { EventSource } from "@eventi/core";
import { GoogleEventsScraperSource } from "./google-events-scraper";
import { GoogleEventsSerpApiSource } from "./google-events-serpapi";
import { DiceSource } from "./stubs/dice";
import { ResidentAdvisorSource } from "./stubs/resident-advisor";
import { TicketmasterSource } from "./ticketmaster";

/** Quale adapter usare per la copertura italiana. Default: scraper (costo 0). */
export type ItSourceMode = "serpapi" | "scraper";

export function itSourceMode(): ItSourceMode {
  return process.env.EVENT_SOURCE_IT === "serpapi" ? "serpapi" : "scraper";
}

/**
 * Costruisce la lista di fonti attive in ordine di priorita' (free-first):
 *   1. Ticketmaster (se TICKETMASTER_KEY)
 *   2. copertura IT: scraper (default) o serpapi (se EVENT_SOURCE_IT=serpapi)
 *   3. stub Fase 2 (RA/DICE) inclusi ma disattivati (isConfigured=false)
 *
 * Filtra fuori cio' che non e' configurato: il sistema gira anche con UNA fonte.
 */
export function getEventSources(): EventSource[] {
  const it: EventSource =
    itSourceMode() === "serpapi"
      ? new GoogleEventsSerpApiSource()
      : new GoogleEventsScraperSource();

  const all: EventSource[] = [
    new TicketmasterSource(),
    it,
    new ResidentAdvisorSource(),
    new DiceSource(),
  ];

  return all.filter((s) => s.isConfigured());
}
