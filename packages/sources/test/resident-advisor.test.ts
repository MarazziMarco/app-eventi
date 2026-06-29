import { describe, expect, it } from "vitest";
import { dedupeEvents } from "@eventi/core";
import {
  normalizeRaEvent,
  ResidentAdvisorSource,
  type RaEvent,
} from "../src/resident-advisor";
import { buildMockEvents } from "../src/mock-events";

const sample: RaEvent = {
  id: "1748293",
  title: "Sterns presents Jeff Mills",
  date: "2026-07-18",
  startTime: "2026-07-18T23:00:00.000Z",
  contentUrl: "/events/1748293",
  flyerFront: "https://imgs.ra.co/flyer.jpg",
  isTicketed: true,
  artists: [{ name: "Jeff Mills" }, { name: "Support DJ" }],
  venue: { name: "Magazzini Generali", area: { name: "Milano" } },
};

describe("normalizeRaEvent", () => {
  it("mappa un evento RA in RawEvent nightlife", () => {
    const ev = normalizeRaEvent(sample, "Milano");
    expect(ev.source).toBe("resident_advisor");
    expect(ev.category).toBe("nightlife");
    expect(ev.title).toBe("Sterns presents Jeff Mills");
    expect(ev.start).toBe("2026-07-18T23:00:00.000Z");
    expect(ev.venue.name).toBe("Magazzini Generali");
    expect(ev.city).toBe("Milano");
    expect(ev.url).toBe("https://ra.co/events/1748293");
    expect(ev.image).toBe("https://imgs.ra.co/flyer.jpg");
    expect(ev.ticketSources).toHaveLength(1);
  });

  it("headliner = primo artista della lineup (per enrichment Spotify)", () => {
    const ev = normalizeRaEvent(sample, "Milano");
    expect(ev.artist?.name).toBe("Jeff Mills");
  });

  it("evento non ticketato => nessun ticketSource", () => {
    const ev = normalizeRaEvent({ ...sample, isTicketed: false }, "Milano");
    expect(ev.ticketSources).toHaveLength(0);
  });

  it("senza startTime usa la data con default serale", () => {
    const ev = normalizeRaEvent(
      { ...sample, startTime: undefined, date: "2026-07-18" },
      "Milano",
    );
    expect(ev.start).toBe("2026-07-18T22:00:00.000Z");
  });
});

describe("ResidentAdvisorSource.isConfigured", () => {
  it("attivo di default", () => {
    delete process.env.RA_ENABLED;
    expect(new ResidentAdvisorSource().isConfigured()).toBe(true);
  });

  it("disattivabile con RA_ENABLED=0", () => {
    process.env.RA_ENABLED = "0";
    expect(new ResidentAdvisorSource().isConfigured()).toBe(false);
    delete process.env.RA_ENABLED;
  });

  it("città senza area RA => nessun fetch, ritorna []", async () => {
    const src = new ResidentAdvisorSource();
    const out = await src.fetchEvents({
      lat: 42.42,
      lng: 12.1,
      radiusKm: 30,
      from: "2026-07-01",
      to: "2026-08-30",
      cityLabel: "Viterbo",
    });
    expect(out).toEqual([]);
  });
});

describe("dedup cross-fonte RA + SerpApi", () => {
  it("stesso evento da RA e SerpApi => 1 Event con due sources", () => {
    const ra = normalizeRaEvent(
      {
        id: "999",
        title: "Tale Of Us @ Fabrique",
        startTime: "2026-07-25T23:00:00.000Z",
        contentUrl: "/events/999",
        isTicketed: true,
        artists: [{ name: "Tale Of Us" }],
        venue: { name: "Fabrique", area: { name: "Milano" } },
      },
      "Milano",
    );
    const serpapi = {
      source: "google_events_serpapi",
      title: "Tale of Us - Fabrique",
      category: "nightlife" as const,
      start: "2026-07-25T22:30:00.000Z",
      venue: { name: "Fabrique" },
      city: "Milano",
      url: "https://serp/tale",
      ticketSources: [{ name: "ticketone", url: "https://t1/tale" }],
    };

    const merged = dedupeEvents([ra, serpapi]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.sources.sort()).toEqual([
      "google_events_serpapi",
      "resident_advisor",
    ]);
    expect(merged[0]!.ticketSources.length).toBeGreaterThanOrEqual(2);
  });

  it("le fixture mock includono almeno un evento nightlife club", () => {
    const nightlife = buildMockEvents().filter((e) => e.category === "nightlife");
    expect(nightlife.length).toBeGreaterThanOrEqual(2);
  });
});
