import { describe, expect, it } from "vitest";
import { corsHeaders } from "../lib/cors";

describe("corsHeaders", () => {
  it("consente qualsiasi origin (app Capacitor) e i metodi GET/OPTIONS", () => {
    const h = corsHeaders();
    expect(h["Access-Control-Allow-Origin"]).toBe("*");
    expect(h["Access-Control-Allow-Methods"]).toContain("GET");
    expect(h["Access-Control-Allow-Methods"]).toContain("OPTIONS");
  });
});
