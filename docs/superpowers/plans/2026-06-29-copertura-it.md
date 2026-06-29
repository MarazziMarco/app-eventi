# Copertura IT multi-fonte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere copertura eventi italiana affidabile facendo girare più fonti free insieme (SerpApi + scraper + Resident Advisor + Ticketmaster) con un nuovo adapter Resident Advisor per il nightlife.

**Architecture:** Nessuna modifica al `core` (schema/dedup/ranking/filtro invariati). Lavoro in `@eventi/sources` (nuovo adapter RA, registry non-esclusivo, fixture mock) e `@eventi/config` (mappa città→areaId RA). RA è un adapter `EventSource` come gli altri; il dedup esistente fonde gli eventi cross-fonte.

**Tech Stack:** TypeScript strict, pnpm workspaces, Vitest, `fetch` (Node 20+), Resident Advisor GraphQL (`https://ra.co/graphql`, non ufficiale).

---

## File Structure

- **Create** `config/src/ra-areas.ts` — mappa `cityLabel → RA areaId` + `raAreaForCity()`.
- **Modify** `config/src/index.ts` — export di `ra-areas`.
- **Create** `config/test/ra-areas.test.ts` — test mappatura aree.
- **Modify** `vitest.config.ts` — includere `config/test/**`.
- **Create** `packages/sources/src/resident-advisor.ts` — adapter RA (tipi, normalizer puro, fetch GraphQL, classe).
- **Delete** `packages/sources/src/stubs/resident-advisor.ts` — sostituito dall'adapter reale.
- **Modify** `packages/sources/src/registry.ts` — registry non-esclusivo + RA.
- **Modify** `packages/sources/src/index.ts` — export RA dalla nuova posizione, rimuovere export stub.
- **Modify** `packages/sources/src/mock-events.ts` — 2 eventi nightlife mock.
- **Create** `packages/sources/test/resident-advisor.test.ts` — normalizer + dedup cross-fonte.
- **Create** `packages/sources/test/registry.test.ts` — registry include RA / override.
- **Modify** `.env.example` — `RA_ENABLED`, chiarire `EVENT_SOURCE_IT` opzionale.

---

## Task 1: Config aree Resident Advisor

**Files:**
- Create: `config/src/ra-areas.ts`
- Modify: `config/src/index.ts`
- Modify: `vitest.config.ts`
- Test: `config/test/ra-areas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `config/test/ra-areas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { raAreaForCity } from "../src/ra-areas";

describe("raAreaForCity", () => {
  it("ritorna areaId per città nota (case/accenti-insensitive)", () => {
    expect(raAreaForCity("Roma")).toBe(20);
    expect(raAreaForCity("MILANO")).toBe(13);
  });

  it("ritorna undefined per città senza area RA", () => {
    expect(raAreaForCity("Viterbo")).toBeUndefined();
    expect(raAreaForCity(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Update vitest include so config tests run**

Modify `vitest.config.ts`, replace the `include` array:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/test/**/*.test.ts", "config/test/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- ra-areas`
Expected: FAIL — cannot find module `../src/ra-areas`.

- [ ] **Step 4: Implement `config/src/ra-areas.ts`**

```ts
/**
 * Resident Advisor filtra gli eventi per "area" numerica, non per lat/lng.
 * Qui mappiamo le città che supportiamo sul loro RA areaId.
 *
 * NB: gli areaId vanno confermati contro ra.co in fase di test live (aprire
 * https://ra.co/events/it/<citta> e leggere l'area nelle richieste GraphQL).
 * I valori sotto sono il punto di partenza; correggili se la query torna vuota.
 */

export const RA_AREAS: Record<string, number> = {
  roma: 20,
  milano: 13,
  bologna: 18,
  napoli: 24,
  torino: 23,
  firenze: 19,
};

function normalizeCity(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** areaId RA per una città, o undefined se non supportata. */
export function raAreaForCity(cityLabel: string | undefined): number | undefined {
  if (!cityLabel) return undefined;
  return RA_AREAS[normalizeCity(cityLabel)];
}
```

- [ ] **Step 5: Export from config barrel**

Modify `config/src/index.ts`, add line:

```ts
export * from "./ra-areas";
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test -- ra-areas`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add config/src/ra-areas.ts config/src/index.ts config/test/ra-areas.test.ts vitest.config.ts
git commit -m "feat(config): Resident Advisor area mapping (city -> areaId)"
```

---

## Task 2: Adapter RA — tipi + normalizer puro

**Files:**
- Create: `packages/sources/src/resident-advisor.ts`
- Test: `packages/sources/test/resident-advisor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/sources/test/resident-advisor.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- resident-advisor`
Expected: FAIL — cannot find module `../src/resident-advisor`.

- [ ] **Step 3: Implement tipi + normalizer in `packages/sources/src/resident-advisor.ts`**

```ts
import { raAreaForCity, resolveCapacityTier } from "@eventi/config";
import { cached, type EventSource, type GeoQuery, type RawEvent } from "@eventi/core";

/**
 * Resident Advisor — specialista nightlife (club elettronica/tendenza).
 * GraphQL NON ufficiale: tutto isolato e con fallback pulito ([]).
 */

export type RaArtist = { name: string };
export type RaVenue = { name?: string; area?: { name?: string } };
export type RaEvent = {
  id: string;
  title: string;
  date?: string; // ISO date
  startTime?: string; // ISO datetime
  endTime?: string;
  contentUrl?: string; // es. "/events/123"
  flyerFront?: string;
  isTicketed?: boolean;
  artists?: RaArtist[];
  venue?: RaVenue;
};

/** Mappa un evento RA nello schema RawEvent comune. Funzione pura, testabile. */
export function normalizeRaEvent(e: RaEvent, cityLabel: string | undefined): RawEvent {
  const start =
    e.startTime ?? (e.date ? `${e.date.slice(0, 10)}T22:00:00.000Z` : new Date().toISOString());
  const venueName = e.venue?.name;
  const city = e.venue?.area?.name ?? cityLabel;
  const url = e.contentUrl ? `https://ra.co${e.contentUrl}` : "https://ra.co";
  const headliner = e.artists?.[0]?.name;

  return {
    source: "resident_advisor",
    title: e.title,
    category: "nightlife",
    start,
    ...(e.endTime ? { end: e.endTime } : {}),
    venue: {
      ...(venueName ? { name: venueName } : {}),
      capacityTier: resolveCapacityTier(venueName),
    },
    ...(city ? { city } : {}),
    url,
    ticketSources: e.isTicketed ? [{ name: "resident advisor", url }] : [],
    ...(e.flyerFront ? { image: e.flyerFront } : {}),
    ...(headliner ? { artist: { name: headliner } } : {}),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- resident-advisor`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/sources/src/resident-advisor.ts packages/sources/test/resident-advisor.test.ts
git commit -m "feat(sources): Resident Advisor types + pure normalizer"
```

---

## Task 3: Adapter RA — fetch GraphQL + classe EventSource

**Files:**
- Modify: `packages/sources/src/resident-advisor.ts`
- Test: `packages/sources/test/resident-advisor.test.ts`

- [ ] **Step 1: Add the failing test (isConfigured gating)**

Append to `packages/sources/test/resident-advisor.test.ts`:

```ts
import { ResidentAdvisorSource } from "../src/resident-advisor";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- resident-advisor`
Expected: FAIL — `ResidentAdvisorSource` is not exported.

- [ ] **Step 3: Implement fetch + class (append to `resident-advisor.ts`)**

```ts
const RA_GRAPHQL = "https://ra.co/graphql";
const RA_TTL = 12 * 3600; // nightlife cambia spesso ma non ogni ora

type RaResponse = { data?: { eventListings?: { data?: { event: RaEvent }[] } } };

/** Query GraphQL RA isolata: se RA cambia schema, si tocca solo qui. */
async function fetchRaListings(areaId: number, from: string, to: string): Promise<RaEvent[]> {
  const query = `query ($filters: FilterInputDtoInput, $page: Int, $pageSize: Int) {
    eventListings(filters: $filters, page: $page, pageSize: $pageSize) {
      data {
        event {
          id title date startTime endTime contentUrl flyerFront isTicketed
          artists { name }
          venue { name area { name } }
        }
      }
    }
  }`;
  const variables = {
    filters: {
      areas: { eq: areaId },
      listingDate: { gte: from.slice(0, 10), lte: to.slice(0, 10) },
    },
    page: 1,
    pageSize: 50,
  };

  const res = await fetch(RA_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Referer: "https://ra.co/",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`RA HTTP ${res.status}`);
  const json = (await res.json()) as RaResponse;
  return (json.data?.eventListings?.data ?? []).map((d) => d.event);
}

export class ResidentAdvisorSource implements EventSource {
  readonly id = "resident_advisor";

  isConfigured(): boolean {
    return process.env.RA_ENABLED !== "0";
  }

  async fetchEvents(q: GeoQuery): Promise<RawEvent[]> {
    const areaId = raAreaForCity(q.cityLabel);
    if (areaId === undefined) return []; // RA non ha quest'area

    try {
      const listings = await cached<RaEvent[]>(
        `ra:${areaId}:${q.from.slice(0, 10)}:${q.to.slice(0, 10)}`,
        () => fetchRaListings(areaId, q.from, q.to),
        RA_TTL,
      );
      return listings.map((e) => normalizeRaEvent(e, q.cityLabel));
    } catch (err) {
      console.warn(`[ra] Resident Advisor non disponibile: ${(err as Error).message}. Salto.`);
      return [];
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- resident-advisor`
Expected: PASS (7 tests total in file).

- [ ] **Step 5: Commit**

```bash
git add packages/sources/src/resident-advisor.ts packages/sources/test/resident-advisor.test.ts
git commit -m "feat(sources): Resident Advisor GraphQL fetch + EventSource adapter"
```

---

## Task 4: Registry non-esclusivo + RA

**Files:**
- Modify: `packages/sources/src/registry.ts`
- Modify: `packages/sources/src/index.ts`
- Delete: `packages/sources/src/stubs/resident-advisor.ts`
- Test: `packages/sources/test/registry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/sources/test/registry.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- registry`
Expected: FAIL — l'attuale registry è esclusivo (non contiene sia serpapi sia scraper) e usa lo stub RA.

- [ ] **Step 3: Rewrite `packages/sources/src/registry.ts`**

```ts
import type { EventSource } from "@eventi/core";
import { GoogleEventsScraperSource } from "./google-events-scraper";
import { GoogleEventsSerpApiSource } from "./google-events-serpapi";
import { ResidentAdvisorSource } from "./resident-advisor";
import { DiceSource } from "./stubs/dice";
import { TicketmasterSource } from "./ticketmaster";

/** Override opzionale per forzare UNA sola fonte IT (debug). */
export type ItSourceMode = "serpapi" | "scraper";

export function itSourceOverride(): ItSourceMode | undefined {
  const v = process.env.EVENT_SOURCE_IT;
  return v === "serpapi" || v === "scraper" ? v : undefined;
}

/**
 * Tutte le fonti configurate girano INSIEME (il dedup le fonde):
 *   - Ticketmaster (se TICKETMASTER_KEY)
 *   - copertura IT: SerpApi (se key) + scraper, oppure solo quella forzata
 *     da EVENT_SOURCE_IT
 *   - Resident Advisor (nightlife; off con RA_ENABLED=0)
 *   - stub Fase 2 (DICE) inclusi ma disattivati
 *
 * Filtra fuori cio' che non e' configurato: gira anche con UNA sola fonte.
 */
export function getEventSources(): EventSource[] {
  const override = itSourceOverride();
  const itSources: EventSource[] =
    override === "serpapi"
      ? [new GoogleEventsSerpApiSource()]
      : override === "scraper"
        ? [new GoogleEventsScraperSource()]
        : [new GoogleEventsSerpApiSource(), new GoogleEventsScraperSource()];

  const all: EventSource[] = [
    new TicketmasterSource(),
    ...itSources,
    new ResidentAdvisorSource(),
    new DiceSource(),
  ];

  return all.filter((s) => s.isConfigured());
}
```

- [ ] **Step 4: Update `packages/sources/src/index.ts`**

Replace the two stub lines for RA with the new adapter. The export block should read:

```ts
export * from "./http";
export * from "./category";
export * from "./ticketmaster";
export * from "./spotify";
export * from "./google-events-serpapi";
export * from "./google-events-scraper";
export * from "./resident-advisor";
export * from "./registry";
export * from "./mock-events";
export * from "./pipeline";
export * from "./stubs/dice";
export * from "./stubs/predicthq";
```

(Note: the `./stubs/resident-advisor` export is removed.)

- [ ] **Step 5: Delete the stub**

```bash
git rm packages/sources/src/stubs/resident-advisor.ts
```

- [ ] **Step 5b: Fix `scripts/validate.ts` (renamed export)**

`validate.ts` importa e chiama `itSourceMode()`, che non esiste più. Aggiorna
l'import e la riga di stampa.

Change the import line:

```ts
import { runPipeline, type PipelineResult } from "@eventi/sources";
import { itSourceOverride } from "@eventi/sources";
```

Change the header `console.log` inside `main()`:

```ts
  console.log(
    `Finestra: ${from} → ${to}  |  raggio 30km  |  fonte IT: ${itSourceOverride() ?? "tutte"}`,
  );
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test -- registry`
Expected: PASS (4 tests).

Run: `pnpm typecheck`
Expected: no errors (conferma che nulla importava più lo stub rimosso).

- [ ] **Step 7: Commit**

```bash
git add packages/sources/src/registry.ts packages/sources/src/index.ts packages/sources/test/registry.test.ts scripts/validate.ts
git commit -m "feat(sources): non-exclusive registry, run all IT sources + RA together"
```

---

## Task 5: Fixture mock nightlife + dedup cross-fonte

**Files:**
- Modify: `packages/sources/src/mock-events.ts`
- Test: `packages/sources/test/resident-advisor.test.ts`

- [ ] **Step 1: Write the failing dedup cross-fonte test**

Append to `packages/sources/test/resident-advisor.test.ts`:

```ts
import { dedupeEvents } from "@eventi/core";
import { buildMockEvents } from "../src/mock-events";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- resident-advisor`
Expected: FAIL — at most 1 nightlife event currently in mock fixtures (Goa Club), test expects >= 2.

- [ ] **Step 3: Add 2 nightlife mock events**

In `packages/sources/src/mock-events.ts`, inside the array returned by
`buildMockEvents()`, add these two entries in the Roma section (after the
existing `Goa Club` mock):

```ts
    mock({
      title: "Tale Of Us @ Largo Venue",
      category: "nightlife",
      start: inDays(24),
      venue: { name: "Largo Venue", lat: 41.8896, lng: 12.5145 },
      city: "Roma",
      url: "https://example.com/taleofus",
      ticketSources: [{ name: "resident advisor", url: "https://ra.co/events/x", price: 35 }],
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600",
      artist: { name: "Tale Of Us", spotifyPopularity: 68, spotifyFollowers: 900_000 },
    }),
    mock({
      title: "Serata reggaeton @ Piper Club",
      category: "nightlife",
      start: inDays(13),
      venue: { name: "Piper Club", lat: 41.9183, lng: 12.4922 },
      city: "Roma",
      url: "https://example.com/piper",
      ticketSources: [{ name: "dice", url: "https://dice/piper", price: 18 }],
      image: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=600",
    }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- resident-advisor`
Expected: PASS (all tests in file, incl. cross-fonte + mock nightlife).

- [ ] **Step 5: Commit**

```bash
git add packages/sources/src/mock-events.ts packages/sources/test/resident-advisor.test.ts
git commit -m "feat(sources): nightlife mock fixtures + cross-source dedup test"
```

---

## Task 6: Env + docs

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update `.env.example`**

Replace the "Copertura italiana" block with:

```
# --- Copertura italiana: girano TUTTE le fonti configurate insieme ---
# Senza override, usa SerpApi (se SERPAPI_KEY) + scraper + Resident Advisor.
# EVENT_SOURCE_IT forza UNA sola fonte IT (debug): scraper | serpapi.
EVENT_SOURCE_IT=

# SerpApi google_events (free ~100-250 ricerche/mese, cache 1x/giorno).
SERPAPI_KEY=

# Resident Advisor (nightlife): nessuna chiave. Metti 0 per disattivarlo.
RA_ENABLED=
```

- [ ] **Step 2: Update README sources section**

In `README.md`, update the env var table to add the `RA_ENABLED` row and change
the `EVENT_SOURCE_IT` description to "override opzionale; default = tutte le
fonti IT insieme". Add a line under the budget-zero bullet list:

```
- **Resident Advisor** (nightlife club/elettronica): gratis, nessuna chiave, attivo di default. Copre i club di tendenza nelle grandi città; non le discoteche commerciali solo-social.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document Resident Advisor source + non-exclusive IT sources"
```

---

## Task 7: Verifica finale completa

**Files:** nessuno (solo verifica).

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: tutti i file verdi (core 16 + ra-areas 2 + resident-advisor ~9 + registry 4).

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm typecheck`
Expected: no errors.

Run: `node node_modules/eslint/bin/eslint.js .`
Expected: exit 0.

- [ ] **Step 3: Validate zero-key (mock include nightlife)**

Run: `pnpm validate`
Expected: gira; Roma mostra anche eventi `nightlife` (Tale Of Us / Piper / Goa).

- [ ] **Step 4: (Opzionale, richiede SERPAPI_KEY/rete) validate live**

Con `.env` valorizzato:
Run: `pnpm validate`
Expected: per Roma/Milano la colonna `{fonti}` mostra più fonti merge-ate
(es. `{google_events_serpapi+resident_advisor}`); Viterbo resta sparso (RA vuoto).

- [ ] **Step 5: Commit (se non già pulito)**

```bash
git status   # atteso: working tree clean
```

---

## Note di implementazione

- **RA è non ufficiale:** se `fetchRaListings` torna vuoto, verifica gli `areaId`
  in `config/src/ra-areas.ts` e lo schema della query contro ra.co (potrebbe
  cambiare nomi campi). L'adapter fallisce pulito, quindi nessun crash.
- **Sinergia Spotify automatica:** il pipeline esistente arricchisce
  `artist.name` (headliner RA) con la popolarità Spotify → nessun task dedicato.
- **Nessuna modifica a core/UI/api:** beneficiano delle nuove fonti via pipeline.
