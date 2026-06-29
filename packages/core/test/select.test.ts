import { describe, expect, it } from "vitest";
import { selectEvents } from "../src/select";
import { event, testSelectionConfig as cfg } from "./fixtures";

describe("selectEvents - filtro adattivo", () => {
  it("Viterbo-sparse: N <= soglia => mostra TUTTO, ordinato per hype", () => {
    const events = [
      event({ id: "a", hypeScore: 20 }),
      event({ id: "b", hypeScore: 80 }),
      event({ id: "c", hypeScore: 50 }),
    ];
    const out = selectEvents(events, cfg);
    expect(out).toHaveLength(3); // mostra tutto
    expect(out.map((e) => e.id)).toEqual(["b", "c", "a"]); // ordinato desc
  });

  it("Roma-dense: N grande, molti sopra MIN_HYPE => cutoff qualitativo", () => {
    // 26 eventi: 12 alti (>=60) cosi' aboveMin >= soglia => taglio a MIN_HYPE
    const high = Array.from({ length: 12 }, (_, i) => event({ id: `h${i}`, hypeScore: 62 + i }));
    const low = Array.from({ length: 14 }, (_, i) => event({ id: `l${i}`, hypeScore: 10 + i }));
    const out = selectEvents([...high, ...low], cfg);

    expect(out.length).toBe(12); // solo quelli >= MIN_HYPE
    expect(out.every((e) => e.hypeScore >= cfg.minHype)).toBe(true);
  });

  it("fallback su top P% quando pochi superano MIN_HYPE ma N e' grande", () => {
    // 30 eventi tutti sotto MIN_HYPE => usa byPercent (top 30% = 9), almeno showAllThreshold
    const events = Array.from({ length: 30 }, (_, i) => event({ id: `e${i}`, hypeScore: 10 + i })); // 10..39
    const out = selectEvents(events, cfg);
    expect(out.length).toBe(Math.max(cfg.showAllThreshold, Math.ceil(30 * cfg.topPercent)));
  });

  it("allowlist: venue famoso passa SEMPRE anche sotto cutoff", () => {
    const high = Array.from({ length: 15 }, (_, i) => event({ id: `h${i}`, hypeScore: 70 + i }));
    const famousLow = event({
      id: "famous",
      hypeScore: 5,
      venue: { name: "Cocorico", capacityTier: 2 },
    });
    const out = selectEvents([...high, famousLow], {
      ...cfg,
      isFamous: (name) => name === "Cocorico",
    });
    expect(out.some((e) => e.id === "famous")).toBe(true);
  });
});
