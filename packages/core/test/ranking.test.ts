import { describe, expect, it } from "vitest";
import { computeHypeScore } from "../src/ranking";
import { event, testRankingConfig as cfg } from "./fixtures";

describe("computeHypeScore", () => {
  it("ritorna 0-100", () => {
    const s = computeHypeScore(event(), cfg);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it("uno stadio batte un piccolo club a parita' di resto", () => {
    const big = computeHypeScore(event({ venue: { capacityTier: 3 } }), cfg);
    const small = computeHypeScore(event({ venue: { capacityTier: 0 } }), cfg);
    expect(big).toBeGreaterThan(small);
  });

  it("artista popolare alza lo score di un concerto", () => {
    const base = event({ category: "concert", venue: { capacityTier: 2 } });
    const popular = computeHypeScore(
      { ...base, artist: { name: "X", spotifyPopularity: 95 } },
      cfg,
    );
    const unknown = computeHypeScore(
      { ...base, artist: { name: "Y", spotifyPopularity: 5 } },
      cfg,
    );
    expect(popular).toBeGreaterThan(unknown);
  });

  it("evento senza artista non e' penalizzato dal peso Spotify", () => {
    // uno sport in stadio sold-out deve restare alto pur senza Spotify
    const sport = computeHypeScore(
      event({
        category: "sport",
        venue: { capacityTier: 3 },
        soldOut: true,
        ticketSources: [{ name: "tm", url: "u" }],
      }),
      cfg,
    );
    expect(sport).toBeGreaterThan(70);
  });

  it("externalRank fa blend e domina con blend alto", () => {
    const ev = event({ venue: { capacityTier: 0 }, category: "other", externalRank: 100 });
    const s = computeHypeScore(ev, cfg);
    // blend 0.6 su externalRank=100 => almeno 60
    expect(s).toBeGreaterThanOrEqual(60);
  });

  it("festival pesa piu' di 'other' a parita' di venue", () => {
    const v = { capacityTier: 2 as const };
    const festival = computeHypeScore(event({ category: "festival", venue: v }), cfg);
    const other = computeHypeScore(event({ category: "other", venue: v }), cfg);
    expect(festival).toBeGreaterThan(other);
  });
});
