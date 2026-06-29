import { describe, expect, it } from "vitest";
import { dedupeEvents, isSameEvent, titleSimilarity } from "../src/dedup";
import { rawEvent } from "./fixtures";

describe("titleSimilarity", () => {
  it("titoli identici = 1", () => {
    expect(titleSimilarity("Vasco Live 2026", "Vasco Live 2026")).toBe(1);
  });
  it("titoli diversi = basso", () => {
    expect(titleSimilarity("Vasco Live", "Mostra Caravaggio")).toBeLessThan(0.3);
  });
});

describe("isSameEvent", () => {
  it("stesso titolo+giorno+venue = stesso evento", () => {
    const a = rawEvent({ title: "Coldplay World Tour", start: "2026-07-10T20:00:00Z", venue: { name: "Stadio Olimpico" } });
    const b = rawEvent({ title: "Coldplay - World Tour", start: "2026-07-10T21:00:00Z", venue: { name: "Stadio Olimpico" } });
    expect(isSameEvent(a, b)).toBe(true);
  });
  it("giorni diversi = eventi diversi", () => {
    const a = rawEvent({ title: "Coldplay", start: "2026-07-10T20:00:00Z" });
    const b = rawEvent({ title: "Coldplay", start: "2026-07-11T20:00:00Z" });
    expect(isSameEvent(a, b)).toBe(false);
  });
});

describe("dedupeEvents", () => {
  it("fonde stesso evento da due fonti unendo sources e ticketSources", () => {
    const fromGoogle = rawEvent({
      source: "google_events",
      title: "Maneskin Roma",
      start: "2026-08-01T20:00:00Z",
      venue: { name: "Stadio Olimpico" },
      city: "Roma",
      ticketSources: [{ name: "ticketone", url: "https://t1/maneskin" }],
      image: "https://img/google.jpg",
    });
    const fromTm = rawEvent({
      source: "ticketmaster",
      title: "Maneskin - Roma",
      start: "2026-08-01T20:30:00Z",
      venue: { name: "Stadio Olimpico" },
      city: "Roma",
      ticketSources: [{ name: "ticketmaster", url: "https://tm/maneskin" }],
    });

    const merged = dedupeEvents([fromGoogle, fromTm]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.sources.sort()).toEqual(["google_events", "ticketmaster"]);
    expect(merged[0]!.ticketSources).toHaveLength(2);
    expect(merged[0]!.image).toBe("https://img/google.jpg");
  });

  it("eventi distinti restano separati", () => {
    const a = rawEvent({ title: "Evento A", start: "2026-08-01T20:00:00Z" });
    const b = rawEvent({ title: "Evento B totalmente diverso", start: "2026-09-01T20:00:00Z" });
    expect(dedupeEvents([a, b])).toHaveLength(2);
  });
});
