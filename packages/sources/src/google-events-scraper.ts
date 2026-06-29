import { resolveCapacityTier } from "@eventi/config";
import { cached, type EventSource, type GeoQuery, type RawEvent } from "@eventi/core";
import { inferCategory } from "./category";
import { IT_SOURCE_TTL } from "./google-events-serpapi";

/**
 * Copertura italiana via SCRAPER self-hosted (Playwright) della pagina
 * Google Events. Gratis e SENZA TETTO, ma piu' fragile di SerpApi.
 *
 * Scelte difensive:
 *  - playwright e' optionalDependency: import dinamico, se assente -> [] (no crash).
 *  - timeout e gestione blocco/CAPTCHA: in caso di problema ritorna [] pulito
 *    cosi' le altre fonti continuano a dare risultati.
 *  - cache 1x/giorno per citta' (IT_SOURCE_TTL) per non farsi bloccare.
 *
 * NB: il parsing del DOM di Google e' intrinsecamente instabile. I selettori
 * sono best-effort e isolati in scrapeGoogleEvents() per essere aggiornati a
 * parte senza toccare il resto.
 */

export class GoogleEventsScraperSource implements EventSource {
  readonly id = "google_events_scraper";

  /** Sempre "configurato": non richiede chiavi. La disponibilita' reale
   *  dipende da playwright installato, gestita a runtime. */
  isConfigured(): boolean {
    return true;
  }

  async fetchEvents(q: GeoQuery): Promise<RawEvent[]> {
    const city = q.cityLabel ?? `${q.lat},${q.lng}`;
    const scraped = await cached<ScrapedEvent[]>(
      `scraper:${city}`,
      () => scrapeGoogleEvents(city, q.lang ?? "it"),
      IT_SOURCE_TTL,
    );
    return scraped.map((e) => this.normalize(e, q));
  }

  private normalize(e: ScrapedEvent, q: GeoQuery): RawEvent {
    const category = inferCategory(`${e.title} ${e.subtitle ?? ""}`);
    const start = e.startIso ?? `${q.from}T20:00:00.000Z`;
    return {
      source: this.id,
      title: e.title,
      category,
      start,
      venue: { ...(e.venue ? { name: e.venue } : {}), capacityTier: resolveCapacityTier(e.venue) },
      ...(e.city ?? q.cityLabel ? { city: e.city ?? q.cityLabel } : {}),
      url: e.url ?? "",
      ticketSources: e.url ? [{ name: "google", url: e.url }] : [],
      ...(e.image ? { image: e.image } : {}),
      ...(category === "concert" || category === "festival" ? { artist: { name: e.title } } : {}),
    };
  }
}

type ScrapedEvent = {
  title: string;
  subtitle?: string;
  venue?: string;
  city?: string;
  startIso?: string;
  url?: string;
  image?: string;
};

/**
 * Esegue lo scraping headless della pagina Google Events.
 * Isolato apposta: se cambia il DOM di Google, si tocca solo qui.
 */
async function scrapeGoogleEvents(city: string, lang: string): Promise<ScrapedEvent[]> {
  let chromium: typeof import("playwright").chromium;
  try {
    // webpackIgnore: playwright e' optional + solo runtime server, mai bundlato
    ({ chromium } = await import(/* webpackIgnore: true */ "playwright"));
  } catch {
    console.warn("[scraper] playwright non installato: 'pnpm -w add playwright && npx playwright install chromium'. Salto la fonte.");
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      locale: lang,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    });
    const page = await ctx.newPage();
    const q = encodeURIComponent(`eventi a ${city}`);
    // ibp=htl;events apre il pannello eventi di Google
    await page.goto(`https://www.google.com/search?q=${q}&ibp=htl;events&hl=${lang}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    // consent wall (consent.google.com): clicca "Accetta tutto" e attendi il
    // redirect alla pagina risultati tramite il parametro `continue`.
    if (page.url().includes("consent.google.com")) {
      await page
        .getByRole("button", { name: /accetta tutto|accetta|accept all/i })
        .first()
        .click({ timeout: 4000 })
        .catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    }

    // se Google mostra blocco/CAPTCHA, esci pulito
    const blocked = await page
      .locator("form#captcha-form, div#recaptcha")
      .first()
      .isVisible()
      .catch(() => false);
    if (blocked) {
      console.warn("[scraper] blocco/CAPTCHA rilevato: salto la fonte.");
      return [];
    }

    // Google blocca i browser headless sul pannello eventi con un wall tipo
    // "Il browser, il dispositivo e/o la localita' non sono ancora supportati".
    // In quel caso il pannello non carica: usciamo puliti (usa SerpApi).
    const bodyText = (await page.locator("body").innerText().catch(() => "")) || "";
    if (/non sono ancora supportati|aren't supported yet|not supported yet/i.test(bodyText)) {
      console.warn(
        "[scraper] Google ha bloccato il browser headless (pannello eventi non supportato). " +
          "Per copertura IT affidabile usa EVENT_SOURCE_IT=serpapi.",
      );
      return [];
    }

    // i card eventi hanno jsname stabile-ish; teniamo selettori multipli
    await page.waitForSelector('[jsname="oKdM2c"], div[data-encoded-docid]', { timeout: 8000 }).catch(() => {});
    const cards = page.locator('[jsname="oKdM2c"], div[data-encoded-docid]');
    const count = Math.min(await cards.count(), 40);

    const out: ScrapedEvent[] = [];
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const text = (await card.innerText().catch(() => "")) || "";
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      const url = await card.locator("a").first().getAttribute("href").catch(() => null);
      const image = await card.locator("img").first().getAttribute("src").catch(() => null);
      out.push({
        title: lines[0]!,
        ...(lines[1] ? { subtitle: lines[1] } : {}),
        // euristica: una riga col nome luogo spesso contiene "Â·" o il nome citta'
        ...(lines.find((l) => /·|teatro|stadio|arena|club|piazza/i.test(l))
          ? { venue: lines.find((l) => /·|teatro|stadio|arena|club|piazza/i.test(l)) }
          : {}),
        city,
        ...(url ? { url } : {}),
        ...(image ? { image } : {}),
      });
    }
    return out;
  } catch (err) {
    console.warn(`[scraper] errore scraping (${(err as Error).message}). Salto la fonte.`);
    return [];
  } finally {
    await browser.close().catch(() => {});
  }
}
