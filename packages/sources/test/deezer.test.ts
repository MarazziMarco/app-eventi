import { describe, expect, it } from "vitest";
import { fanToPopularity } from "../src/deezer";

describe("fanToPopularity", () => {
  it("0 fan => 0", () => {
    expect(fanToPopularity(0)).toBe(0);
  });

  it("scala con gli ordini di grandezza (più fan => più popolarità)", () => {
    const small = fanToPopularity(1_000);
    const mid = fanToPopularity(100_000);
    const big = fanToPopularity(10_000_000);
    expect(small).toBeLessThan(mid);
    expect(mid).toBeLessThan(big);
  });

  it("resta in 0-100", () => {
    expect(fanToPopularity(50_000_000)).toBeLessThanOrEqual(100);
    expect(fanToPopularity(50_000_000)).toBeGreaterThan(80);
  });
});
