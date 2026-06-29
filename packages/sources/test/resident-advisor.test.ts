import { describe, expect, it } from "vitest";
import { normalizeRaEvent, type RaEvent } from "../src/resident-advisor";

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
