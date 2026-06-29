import { describe, expect, it } from "vitest";
import { chooseGeoProvider } from "../lib/geo";

describe("chooseGeoProvider", () => {
  it("usa Capacitor su piattaforma nativa", () => {
    expect(chooseGeoProvider(true)).toBe("capacitor");
  });
  it("usa il browser sul web", () => {
    expect(chooseGeoProvider(false)).toBe("web");
  });
});
