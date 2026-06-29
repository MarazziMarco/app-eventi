import { describe, expect, it } from "vitest";
import { raAreaForCity } from "../src/ra-areas";

describe("raAreaForCity", () => {
  it("ritorna areaId per città nota (case/accenti-insensitive)", () => {
    expect(raAreaForCity("Roma")).toBe(52);
    expect(raAreaForCity("MILANO")).toBe(171);
  });

  it("ritorna undefined per città senza area RA", () => {
    expect(raAreaForCity("Viterbo")).toBeUndefined();
    expect(raAreaForCity(undefined)).toBeUndefined();
  });
});
