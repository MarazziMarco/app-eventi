# Design — Fase 2: app nativa (Capacitor) + backend hostato + Supabase

Data: 2026-06-29
Stato: approvato (brainstorming) → pronto per writing-plans (slice 1)

## Obiettivo

Portare l'app sul telefono (iPhone dell'utente) come **app vera installabile**,
con dati reali, mantenendo i segreti server-side. Approccio **B**: UI React
statica nel bundle dell'app, che chiama un'API remota su Vercel.

## Vincoli e decisioni (dal brainstorming)

- **Budget zero mantenuto** dove possibile. Vercel free, Supabase free, Apple ID gratuito.
- **Niente push iOS ora**: le push su iPhone richiedono Apple Developer Program (99$/anno). Si lascia solo la **cucitura** (plugin scaffoldato, disattivato).
- **Install iOS via Apple ID gratuito**: certificato a 7 giorni (re-firma settimanale), device registrato, max 3 app.
- **Focus iPhone** (l'utente ha iPhone). Il progetto **Android** viene generato ma il test su device Android è rimandato (no Android Studio/SDK ora).
- **Mac Apple Silicon**: Xcode.app installato ma `xcode-select` punta ai CommandLineTools; CocoaPods di sistema rotto (ruby 2.6 x86). Vanno sistemati.

## Architettura

```
┌─ iPhone (Capacitor app) ───────────────┐
│  UI React statica (export Next, nel bundle)
│  Capacitor plugins: Geolocation, (Push seam OFF)
│        │  fetch(`${API_BASE}/api/events`)
└────────┼────────────────────────────────┘
         ▼
   Vercel: Next.js  GET /api/events   (SERPAPI_KEY env segreta, CORS)
         │  pipeline: SerpApi + Resident Advisor (+ TM/Spotify se key)
         ▼
   Supabase (free): favorites + saved_locations  (anon auth + RLS)
```

- Il **backend** (UI web + API) resta `apps/web` deployato su Vercel: serve sia il sito web sia l'API che l'app mobile consuma.
- L'**app mobile** è la stessa UI esportata staticamente, che NON usa la route API locale ma `API_BASE` remoto.
- **Supabase** aggiunge persistenza utente (preferiti, posizioni) senza toccare la pipeline eventi.

## Componenti e responsabilità

### 1. Backend su Vercel (slice 1)

- Deploy di `apps/web` (UI + `/api/events`) su Vercel, collegato al repo privato GitHub.
- **Env su Vercel** (server-side, segrete): `SERPAPI_KEY`, `EVENT_SOURCE_IT=serpapi` (lo scraper Playwright non gira su serverless → escluso via override), opzionali `TICKETMASTER_KEY`, `SPOTIFY_CLIENT_ID/SECRET`.
- **CORS** sulla route `/api/events`: consentire l'origin dell'app Capacitor (`capacitor://localhost` su iOS, `http://localhost`/`https://localhost`). Header `Access-Control-Allow-Origin` + gestione `OPTIONS`.
- La route resta `runtime = "nodejs"`.

### 2. Refactor client per API base (slice 1)

- Introdurre `NEXT_PUBLIC_API_BASE` (default vuoto = stesso origin, comportamento web attuale invariato).
- `apps/web/app/page.tsx`: la fetch usa `` `${apiBase}/api/events?...` `` dove `apiBase = process.env.NEXT_PUBLIC_API_BASE ?? ""`.
- Nessuna regressione sul web (base vuota → path relativo come ora).

### 3. Build statica per Capacitor (slice 2)

- Capacitor richiede un `webDir` statico. Si produce un export statico della UI (`output: 'export'`) con `NEXT_PUBLIC_API_BASE` = URL Vercel.
- **Problema noto:** `output: 'export'` non ammette route handler dinamici come `/api/events`. Meccanismo (da fissare nel piano): build dedicato che esclude la route dall'export (es. variabile `CAPACITOR_BUILD` che commuta `next.config` e produce un export contenente solo la pagina, oppure un entrypoint statico separato). L'API non serve nel bundle: l'app usa quella remota.
- Output export → `webDir` per Capacitor.

### 4. Capacitor (slice 2)

- `apps/web/capacitor.config.ts`: `appId` = `com.marazzi.eventi`, `appName` = "Eventi", `webDir` = cartella export.
- Plugin: **@capacitor/geolocation** (posizione nativa per "usa la mia posizione"; permessi in `Info.plist`: `NSLocationWhenInUseUsageDescription`).
- `npx cap add ios` + `npx cap add android` (Android generato, non testato ora).
- **Prerequisiti Mac (slice 2, una tantum):**
  - `sudo xcode-select -s /Applications/Xcode.app`
  - `brew install cocoapods` (sostituisce quello di sistema rotto)
  - Apri Xcode → login con Apple ID (Personal Team) → seleziona il team sul target → registra il device.
- **Run su iPhone:** `npx cap run ios` (o da Xcode), device collegato via cavo, "Trust" sul telefono. Certificato 7gg: re-build/re-firma settimanale.

### 5. Supabase (slice 3)

- Progetto Supabase free. Client `@supabase/supabase-js` nel web/app.
- **Env pubbliche** (ok nel client, protette da RLS): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Auth:** anonymous sign-in (device-scoped) → ogni device ottiene uno user id senza login.
- **Tabelle:**
  - `favorites`: `id`, `user_id` (auth.uid), `event_id`, `payload jsonb` (snapshot evento), `created_at`.
  - `saved_locations`: `id`, `user_id`, `label`, `lat`, `lng`, `created_at`.
- **RLS:** policy `user_id = auth.uid()` su select/insert/delete.
- **UI:** bottone "salva" (cuore) sulle card → upsert in `favorites`; sezione "Le mie posizioni" → `saved_locations`. Stato sincronizzato per device.
- **Seam:** wrapper `lib/storage` con interfaccia (`getFavorites/addFavorite/removeFavorite/...`) così se Supabase non è configurato l'app degrada a storage locale (non blocca il funzionamento eventi).

### 6. Push — cucitura disattivata (slice 4, futuro)

- Installare `@capacitor/push-notifications` ma **non** registrare APNs (richiede Apple Developer a pagamento).
- Modulo `lib/push` con `initPush()` no-op finché `PUSH_ENABLED` è falso. Documentare i passi per attivarla (account pagato, capability, server invio).

## Slice di implementazione (piani separati)

1. **Backend + API base + CORS** — deploy Vercel, `NEXT_PUBLIC_API_BASE`, CORS, web invariato. *Testabile: app web live su URL Vercel, API risponde.*
2. **Capacitor iOS shell** — export statico, capacitor config, geolocation, run su iPhone. *Testabile: app sul telefono mostra eventi reali.*
3. **Supabase persistenza** — tabelle+RLS, anon auth, preferiti+posizioni, seam storage. *Testabile: salvo un evento, resta dopo riavvio.*
4. **Push (futuro)** — solo quando l'utente attiva Apple Developer.

Lo slice 1+2 copre il bisogno immediato ("deploy + sul telefono + testo"). 3 e 4 seguono.

## Testing

- **Slice 1:** verifica `curl https://<vercel>/api/events?lat=..&lng=..&city=Roma` ritorna eventi; web app live carica; CORS preflight OK.
- **Slice 2:** app gira nel simulatore iOS + sul device fisico; "usa la mia posizione" chiede permesso nativo; lista popolata da API remota.
- **Slice 3:** unit test del wrapper `lib/storage` (mock Supabase); manuale: salva/rimuovi preferito persiste tra riavvii; RLS impedisce accesso cross-user.
- Nessun test richiede secret reali in CI (mock/fixture).

## Fuori scope (espliciti)

- Push iOS reali (Apple Developer a pagamento).
- Test su device Android (manca toolchain; progetto generato ma non verificato).
- Pubblicazione su App Store / Play Store.
- Auth con email/social (si usa anonymous; upgrade futuro).

## Criteri di "fatto bene" (per slice 1+2)

- App web live su Vercel; `/api/events` risponde con eventi reali e CORS corretto.
- App Capacitor installata sull'iPhone dell'utente, mostra hero+feed con dati reali presi dall'API remota.
- "Usa la mia posizione" funziona col permesso nativo iOS.
- Nessun segreto nel bundle dell'app (solo `API_BASE` pubblico).
- Web esistente invariato (nessuna regressione; test correnti verdi).
