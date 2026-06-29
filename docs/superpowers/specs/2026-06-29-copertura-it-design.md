# Design — Copertura eventi IT affidabile (multi-fonte)

Data: 2026-06-29
Stato: approvato (brainstorming) → pronto per writing-plans

## Problema

Fase 1 copre bene tour internazionali (Ticketmaster) ma ha un buco sulla
**copertura italiana**, specie sul differenziatore dell'app: nightlife/locali,
festival, eventi unici, concerti IT che non passano da Ticketmaster.

Due vincoli appresi durante il brainstorming:

1. **Ticketmaster è debole in Italia.** Il ticketing dominante è TicketOne (CTS
   Eventim) + Vivaticket/DICE, non Ticketmaster. TM da solo = catalogo magro in IT.
2. **Lo scraper Google è bloccato in headless.** Testato live 2026-06: Google
   serve il wall "Il browser/dispositivo non sono ancora supportati". Non
   risolvibile senza detection-evasion (fuori scope).

## Obiettivo

Massimizzare la copertura IT a **budget ~zero** aggiungendo fonti free dietro
l'interfaccia `EventSource` esistente, **facendo girare più fonti insieme** e
lasciando il dedup fonderle.

### Realtà di copertura (onesta, da brainstorming)

| Categoria | Fonte free | Copertura reale |
|-----------|-----------|-----------------|
| Festival, sport/unici, concerti IT non-TM | SerpApi (Google Eventi) | Buona: Google aggrega TicketOne/Vivaticket/DICE |
| Nightlife club elettronica/tendenza | Resident Advisor | Buona nelle grandi città; festival elettronici |
| Nightlife commerciale **ticketato** | SerpApi | Discreta (se vende biglietti via TicketOne/DICE/Vivaticket) |
| Nightlife commerciale **solo-social** (Instagram/porta) | — | **Non gettabile free in modo robusto.** Mitigato da `FAMOUS_VENUES` allowlist + (futuro) scraper per-venue |
| Tour internazionali grossi | Ticketmaster | Buona |

Limite accettato esplicitamente: le serate promosse solo su Instagram/alla porta
non compaiono. Nessuna fonte free affidabile le risolve.

## Architettura

Nessun cambiamento al `core` (schema, dedup, ranking, filtro adattivo restano
invariati e già testati). Il lavoro è in `@eventi/sources` + `@eventi/config`.

### Cambio chiave: registry non-esclusivo

Oggi `getEventSources()` sceglie UNA fonte IT via `EVENT_SOURCE_IT`
(serpapi | scraper). Nuovo comportamento: **gira tutte le fonti configurate
insieme** (SerpApi + scraper + Resident Advisor + Ticketmaster), il dedup le
fonde. `EVENT_SOURCE_IT` diventa un **override opzionale** per forzarne una sola
(debug). Default: tutte quelle disponibili.

### Fonti e ruoli (post-modifica)

| Fonte | Ruolo | Default |
|-------|-------|---------|
| SerpApi (Google Eventi) | base IT primaria | on se `SERPAPI_KEY` presente |
| Resident Advisor | specialista nightlife | on (`RA_ENABLED=0` per spegnere) |
| Ticketmaster | tour internazionali | on se `TICKETMASTER_KEY` |
| Spotify | segnale ranking (non fonte) | on se credenziali |
| Scraper Google | best-effort, bloccato headless | on ma fallisce pulito |
| Mock | fallback zero-dati | auto |

## Componenti

### 1. Adapter Resident Advisor (`packages/sources/src/resident-advisor.ts`)

Sostituisce lo stub esistente.

- **Transport:** `POST https://ra.co/graphql`. Query `eventListings` con filtri
  `areas: [areaId]` + `listingDate` gte/lte (finestra dalla `GeoQuery`).
- **Mappa aree:** RA filtra per area numerica, non per lat/lng. Serve
  `config/src/ra-areas.ts`: `cityLabel → areaId` per le città supportate
  (Roma, Milano, Bologna, Napoli, Torino, …). Città senza area RA → adapter
  ritorna `[]` (es. Viterbo).
- **Risoluzione area:** match per `cityLabel`; se assente, nessuna query RA.
- **Normalizzazione → `RawEvent`:**
  - `title`, `start`/`end` (date RA ISO)
  - `venue.name` + area; `capacityTier` via `resolveCapacityTier`
  - `artist.name` dalla **lineup** (primo headliner) → poi Spotify lo arricchisce
  - `image` = flyer; `url` = `https://ra.co/events/{id}`
  - `ticketSources` = link RA / tickets; `soldOut` dal flag
  - `category` = `nightlife` (o `festival` se l'evento RA è flaggato festival)
  - `source` = `resident_advisor`
- **Robustezza:** query GraphQL isolata in `fetchRaListings()`; tutto avvolto in
  try/catch → `[]` su errore (non ufficiale, può rompersi). Cache 12h
  (`RA_TTL = 12 * 3600`). Header best-effort: `Content-Type: application/json`,
  User-Agent browser, `Referer: https://ra.co/`.
- **`isConfigured()`:** `true` salvo `RA_ENABLED=0`.

### 2. Config aree RA (`config/src/ra-areas.ts`)

```ts
export const RA_AREAS: Record<string, number> = {
  roma: 20,    // valori reali da verificare in implementazione
  milano: 13,
  // ...
};
export function raAreaForCity(cityLabel?: string): number | undefined;
```

Export aggiunto a `config/src/index.ts`. (Gli areaId reali si verificano in fase
di implementazione contro ra.co.)

### 3. Registry (`packages/sources/src/registry.ts`)

- Costruisce la lista con TUTTE le fonti, poi `.filter(isConfigured)`.
- `EVENT_SOURCE_IT` (se valorizzato) restringe alla sola fonte IT indicata.
- Default senza override: SerpApi (se key) + scraper + RA + TM (se key).

### 4. Env (`.env.example`)

- `SERPAPI_KEY` — fornita dall'utente; abilita SerpApi.
- `RA_ENABLED` — default on; `0` per spegnere RA.
- `EVENT_SOURCE_IT` — override opzionale (`serpapi` | `scraper`), altrimenti tutte.
- Nessuna key per RA.

### 5. Fixture mock

Aggiungere 2 eventi club (es. un techno night a Milano con headliner noto, una
serata in un locale famoso) alle fixture in `mock-events.ts`, così la demo
zero-key mostra anche nightlife.

## Dedup, merge, ranking (invariati nel core)

- Dedup esistente fonde eventi uguali da SerpApi+RA+TM su (titolo norm. + giorno
  + venue/città). `sources` e `ticketSources` uniti; immagine/url migliori.
- Lineup RA → `artist.name` → enricher Spotify → `spotifyPopularity` alza l'hype
  dei DJ grossi.
- `FAMOUS_VENUES` allowlist garantisce che i locali iconici passino il cutoff
  anche con hype basso (copre il "commerciale famoso").
- `CATEGORY_WEIGHT.nightlife` resta tunabile in `config/ranking.ts`.

## Testing (senza rete)

- **Unit normalizer RA:** fixture di risposta GraphQL mock → verifica mappatura
  campi (lineup→artist, venue, url, category, soldOut).
- **Dedup cross-fonte:** un evento presente sia in RA sia in SerpApi → 1 Event
  con `sources = [resident_advisor, google_events_serpapi]` e ticketSources unite.
- **Area mapping:** `raAreaForCity` ritorna id per città note, `undefined` per
  ignote (es. Viterbo).
- Tutti i test usano fixture, nessuna chiamata di rete.

## Fuori scope (espliciti)

- Nightlife commerciale solo-social (Instagram/porta): nessuna fonte free robusta.
- Scraping Instagram / detection-evasion su Google.
- DICE/Bandsintown/PredictHQ: restano stub Fase 2.
- Nessuna modifica a UI o `/api/events` (beneficiano automaticamente delle
  nuove fonti via pipeline).

## Criteri di "fatto bene"

- `pnpm validate` con `SERPAPI_KEY` mostra eventi reali IT in Roma; `sources`
  include più fonti merge-ate (es. `{google_events_serpapi+resident_advisor}`).
- Resident Advisor porta eventi nightlife reali nelle grandi città; fallisce
  pulito dove non ha area (Viterbo) o se la GraphQL cambia.
- Test verdi (normalizer RA, dedup cross-fonte, area mapping) senza rete.
- Zero-key: demo mock mostra anche nightlife.
- Nessuna regressione: core/test esistenti restano verdi.
