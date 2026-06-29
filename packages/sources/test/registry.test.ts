import { afterEach, describe, expect, it } from "vitest";
import { getEventSources } from "../src/registry";

function ids(): string[] {
  return getEventSources().map((s) => s.id);
}

afterEach(() => {
  delete process.env.EVENT_SOURCE_IT;
  delete process.env.SERPAPI_KEY;
  delete process.env.TICKETMASTER_KEY;
  delete process.env.RA_ENABLED;
});

describe("getEventSources", () => {
  it("default: gira scraper IT + Resident Advisor insieme (no chiavi)", () => {
    const list = ids();
    expect(list).toContain("google_events_scraper");
    expect(list).toContain("resident_advisor");
  });

  it("EVENT_SOURCE_IT=serpapi senza key non aggiunge serpapi, ma RA resta", () => {
    process.env.EVENT_SOURCE_IT = "serpapi";
    const list = ids();
    expect(list).not.toContain("google_events_scraper");
    expect(list).not.toContain("google_events_serpapi"); // serpapi off senza key
    expect(list).toContain("resident_advisor");
  });

  it("RA_ENABLED=0 esclude Resident Advisor", () => {
    process.env.RA_ENABLED = "0";
    expect(ids()).not.toContain("resident_advisor");
  });

  it("con SERPAPI_KEY e senza override, serpapi e scraper coesistono", () => {
    process.env.SERPAPI_KEY = "x";
    const list = ids();
    expect(list).toContain("google_events_serpapi");
    expect(list).toContain("google_events_scraper");
  });
});
