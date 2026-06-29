# Eventi migliori vicino a me — Fase 1

Vertical slice per **validare copertura dati + qualita' del ranking** degli eventi
"hype" vicino a una posizione. Comportamento distintivo: **filtro adattivo alla
densita'** — zone piene (Roma) mostrano solo il top, zone vuote (Viterbo) mostrano
tutto. NON e' ancora l'app nativa (niente Capacitor/push/Supabase: solo cuciture pulite).

## Vincolo: budget zero

Gira **senza spendere** e senza carta:

- **Ticketmaster Discovery** (~5000 call/giorno) + **Spotify Web API** (segnale ranking) = base gratis ufficiale.
- Copertura italiana via **scraper Playwright self-hosted** (default, gratis e illimitato) _oppure_ **SerpApi** (opzionale, free ~100–250 ricerche/mese → cache 1×/giorno).

> ⚠️ **Realtà dello scraper (testato live 2026-06):** Google blocca i browser headless sul pannello eventi con il wall _"Il browser, il dispositivo e/o la località non sono ancora supportati"_. Lo scraper gestisce consent-wall e blocco e **fallisce pulito** (ritorna 0, le altre fonti continuano), ma in headless **non porta dati**. Per copertura IT affidabile a costo quasi-zero usa **`EVENT_SOURCE_IT=serpapi`**. Lo scraper resta utile solo headed/con browser reale (Fase 2).
- Nessuna fonte a pagamento. PredictHQ resta stub opzionale.

Tutte le chiavi sono **opzionali**: chiave assente → adapter disattivato, nessun crash.

## Struttura

```
/config            @eventi/config  ranking.ts (pesi+formula) · venues.ts (capacityTier + FAMOUS_VENUES)
/packages/core     @eventi/core    schema, id/dedup, ranking, filtro adattivo, cache, geo (puro, testabile)
/packages/sources  @eventi/sources adapter (ticketmaster, spotify, google_events serpapi+scraper) + pipeline + stub
/apps/web          @eventi/web     Next.js: viewer minimo + GET /api/events
/scripts           validate.ts     CLI Viterbo vs Roma
```

Architettura: **core e' puro** (ranking/select ricevono la config come parametro);
`@eventi/config` fornisce i valori; `@eventi/sources` cuce tutto nel `pipeline`.
Aggiungere una fonte = implementare `EventSource.fetchEvents()` e registrarla.

## Setup

```bash
corepack enable           # abilita pnpm
pnpm install
cp .env.example .env      # compila le chiavi che hai (tutte opzionali)
```

Per lo scraper italiano (default) serve il browser Playwright una volta:

```bash
pnpm -w add playwright    # gia' optionalDependency di @eventi/sources
npx playwright install chromium
```

### Env var (tutte opzionali)

| Var | A cosa serve |
|-----|--------------|
| `TICKETMASTER_KEY` | fonte base gratis (tour/grandi eventi) |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | popolarita' artista (ranking) |
| `EVENT_SOURCE_IT` | `scraper` (default) o `serpapi` |
| `SERPAPI_KEY` | solo se `EVENT_SOURCE_IT=serpapi` |
| `PREDICTHQ_TOKEN` | Fase 2, override score |
| `CACHE_TTL_SECONDS` | TTL cache default (6h); la fonte IT usa 24h |

## Comandi

```bash
pnpm validate     # CLI: Viterbo vs Roma fianco a fianco (vedi sotto)
pnpm dev          # viewer su http://localhost:3000
pnpm test         # unit test: dedup, ranking, filtro adattivo
pnpm typecheck    # tsc -b su tutti i package
pnpm lint         # eslint (no any)
```

## Come ho validato la copertura (leggi i risultati di `pnpm validate`)

1. **Conta i candidati**: `grezzi → dedup → mostrati`. Se `grezzi` è 0 ovunque, nessuna fonte è configurata (compila `.env`).
2. **Viterbo deve mostrare (quasi) tutto**: `mostrati ≈ dedup`, perché N ≤ soglia → niente taglio.
3. **Roma deve tagliare**: `mostrati ≪ dedup`, restano solo hypeScore alti + venue famosi (Olimpico, Foro Italico…).
4. **Controlla l'ordine**: lista per `hypeScore` desc; in cima stadi/arene, artisti popolari, sold-out.
5. **Controlla le fonti**: la colonna `{fonti}` mostra il merge cross-source (es. `{ticketmaster+google_events_scraper}` = dedup riuscito).

## Dove prendere le chiavi (tutte gratis)

| Fonte | Dove | Note |
|-------|------|------|
| Ticketmaster | <https://developer.ticketmaster.com> → crea app → *Consumer Key* | ~5000 call/giorno, nessuna carta |
| Spotify | <https://developer.spotify.com/dashboard> → crea app → Client ID/Secret | Client Credentials, gratis |
| SerpApi (opz.) | <https://serpapi.com/manage-api-key> | free ~100–250 ricerche/mese |

Senza nessuna chiave l'app gira lo stesso sulle **fixture mock** (Roma denso / Viterbo sparso).

## Decisioni prese in autonomia

- **Una sola app Next.js** (API routes + viewer), niente server separato → meno parti in movimento.
- **Cache file-JSON** invece di SQLite: zero dipendenze native, stessa firma → in Fase 2 si sostituisce con Supabase.
- **core puro + dependency injection**: `ranking`/`select` ricevono la config come parametro, `@eventi/config` fornisce i valori → niente dipendenza circolare, tutto testabile.
- **Fallback mock automatico** quando nessuna fonte reale risponde (o `EVENT_SOURCE_MOCK=1`) → demo/test/UI sempre vivi, mai crash.
- **Scraper sempre attivo** ma difensivo: se Playwright non è installato o Google blocca, fallisce pulito e le altre fonti continuano.
- **TTL fonte italiana = 24h**: rispetta i limiti free e non si fa bloccare.
- **Tailwind v3 + token CSS** per il design system "Heat"; font via CDN Fontshare/Google (`@import` in `globals.css`).
- **Lint**: `pnpm lint` (flat config alla root) è la fonte di verità; il lint bundlato di Next è disattivato nel build per non duplicare config.

## Tarare il ranking (dove mettere le mani)

Tutto in `config/src/`:
- `ranking.ts` → `RANKING_WEIGHTS` (peso capienza/artista/categoria/domanda), `CATEGORY_WEIGHT`, `CAPACITY_TIER_SCORE`, `EXTERNAL_RANK_BLEND`.
- `ranking.ts` → `SELECTION`: `SHOW_ALL_THRESHOLD` (sotto = mostra tutto), `TOP_PERCENT`, `MIN_HYPE` (cutoff Roma).
- `venues.ts` → `KNOWN_VENUES` (capacityTier) e `FAMOUS_VENUES` (allowlist che passa sempre).

## Cuciture per la Fase 2

- **Fonti nuove**: stub pronti `resident-advisor.ts`, `dice.ts` (implementa `fetchEvents`, già in `getEventSources`).
- **PredictHQ**: `enrichWithPredictHQ()` (stub) — popola `event.externalRank`, il ranking fa già il blend.
- **Persistenza**: `cache.ts` è file-JSON dietro una firma semplice → sostituibile con Supabase/Redis.
- **App nativa**: il viewer è mobile-first/PWA-ready → Capacitor + push in Fase 2.
