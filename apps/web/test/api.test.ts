import { afterEach, describe, expect, it } from "vitest";
import { apiBase, eventsUrl } from "../lib/api";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_API_BASE;
});

describe("apiBase", () => {
  it("vuoto di default (stesso origin sul web)", () => {
    expect(apiBase()).toBe("");
  });
  it("usa NEXT_PUBLIC_API_BASE e toglie lo slash finale", () => {
    process.env.NEXT_PUBLIC_API_BASE = "https://eventi.vercel.app/";
    expect(apiBase()).toBe("https://eventi.vercel.app");
  });
});

describe("eventsUrl", () => {
  it("costruisce il path relativo di default", () => {
    expect(eventsUrl({ lat: 41.9, lng: 12.5, city: "Roma" })).toBe(
      "/api/events?lat=41.9&lng=12.5&city=Roma",
    );
  });
  it("antepone la base remota quando presente", () => {
    process.env.NEXT_PUBLIC_API_BASE = "https://eventi.vercel.app";
    expect(eventsUrl({ lat: 41.9, lng: 12.5 })).toBe(
      "https://eventi.vercel.app/api/events?lat=41.9&lng=12.5",
    );
  });
});
