import type { Event, RankingConfig, RawEvent, SelectionConfig } from "../src/types";

/** Config di ranking standalone per i test (specchio di @eventi/config). */
export const testRankingConfig: RankingConfig = {
  weights: { capacity: 0.35, artistPopularity: 0.25, category: 0.2, demand: 0.2 },
  capacityTierScore: { 0: 0.1, 1: 0.4, 2: 0.7, 3: 1.0 },
  categoryWeight: {
    festival: 1.0,
    sport: 0.9,
    concert: 0.8,
    nightlife: 0.6,
    expo: 0.5,
    other: 0.3,
  },
  externalRankBlend: 0.6,
};

export const testSelectionConfig: SelectionConfig = {
  showAllThreshold: 10,
  topPercent: 0.3,
  minHype: 60,
};

let seq = 0;

export function rawEvent(over: Partial<RawEvent> = {}): RawEvent {
  seq += 1;
  return {
    source: "test",
    title: `Evento ${seq}`,
    category: "concert",
    start: "2026-07-01T20:00:00.000Z",
    venue: { name: `Venue ${seq}` },
    url: `https://example.com/${seq}`,
    ticketSources: [],
    ...over,
  };
}

export function event(over: Partial<Event> = {}): Event {
  seq += 1;
  return {
    id: `id-${seq}`,
    sources: ["test"],
    title: `Evento ${seq}`,
    category: "concert",
    start: "2026-07-01T20:00:00.000Z",
    venue: { name: `Venue ${seq}`, capacityTier: 1 },
    url: `https://example.com/${seq}`,
    ticketSources: [],
    hypeScore: 0,
    ...over,
  };
}
