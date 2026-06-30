import { resolveCapacityTier } from "@eventi/config";
import { cached, type EventSource, type GeoQuery, type RawEvent } from "@eventi/core";
import { inferCategory } from "./category";
import { fetchJson } from "./http";
import { rankTicketSources } from "./tickets";

/**
 * Copertura italiana via SerpApi (engine=google_events).
 * OPZIONALE: free tier ~100-250 ricerche/mese => cache aggressiva (1x/giorno
 * per citta', vedi IT_SOURCE_TTL). Se SERPAPI_KEY manca, adapter disattivato.
 * Aggrega gia' TicketOne/DICE/RA/Zero ecc.
 */

/** TTL fonte italiana: 1 refresh al giorno per citta' (free-tier friendly). */
export const IT_SOURCE_TTL = 24 * 3600;

const BASE = "https://serpapi.com/search.json";

type SerpTicket = { source?: string; link?: string };
type SerpEvent = {
  title: string;
  date?: { start_date?: string; when?: string };
  address?: string[];
  venue?: { name?: string };
  link?: string;
  thumbnail?: string;
  image?: string;
  description?: string;
  ticket_info?: SerpTicket[];
};
type SerpResponse = { events_results?: SerpEvent[] };

export class GoogleEventsSerpApiSource implements EventSource {
  readonly id = "google_events_serpapi";

  isConfigured(): boolean {
    return Boolean(process.env.SERPAPI_KEY);
  }

  async fetchEvents(q: GeoQuery): Promise<RawEvent[]> {
    if (!this.isConfigured()) return [];
    const city = q.cityLabel ?? `${q.lat},${q.lng}`;
    // NB: NON passare hl/gl. Verificato live (2026-06): con hl=it (e/o gl=it)
    // Google Events ritorna 0 risultati ("hasn't returned any results").
    // Senza, la query italiana "Eventi a <citta>" geolocalizza da sola e
    // ritorna eventi reali della citta'.
    const params = new URLSearchParams({
      engine: "google_events",
      q: `Eventi a ${city}`,
      api_key: process.env.SERPAPI_KEY!,
    });
    const url = `${BASE}?${params.toString()}`;

    const data = await cached<SerpResponse>(
      `serpapi:${city}`,
      () => fetchJson<SerpResponse>(url, { timeoutMs: 15_000 }),
      IT_SOURCE_TTL,
    );

    return (data.events_results ?? []).map((e) => this.normalize(e, q));
  }

  private normalize(e: SerpEvent, q: GeoQuery): RawEvent {
    const venueName = e.venue?.name ?? e.address?.[0];
    const city = e.address?.[e.address.length - 1] ?? q.cityLabel;
    const start = parseSerpDate(e.date?.start_date) ?? `${q.from}T20:00:00.000Z`;
    const category = inferCategory(e.title);
    const ticketSources = rankTicketSources(
      (e.ticket_info ?? [])
        .filter((t) => t.link)
        .map((t) => ({ name: t.source ?? "ticket", url: t.link! })),
    );

    return {
      source: this.id,
      title: e.title,
      category,
      start,
      venue: { ...(venueName ? { name: venueName } : {}), capacityTier: resolveCapacityTier(venueName) },
      ...(city ? { city } : {}),
      // preferisci un venditore ufficiale come link principale, non la rivendita
      url: ticketSources[0]?.url ?? e.link ?? "",
      ticketSources,
      ...(e.image || e.thumbnail ? { image: (e.image ?? e.thumbnail)! } : {}),
      ...(e.description ? { description: e.description } : {}),
      ...(category === "concert" || category === "festival" ? { artist: { name: e.title } } : {}),
    };
  }
}

/** SerpApi date come "Jul 1" / "1 lug" -> ISO best-effort (anno corrente). */
function parseSerpDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const d = new Date(`${s} ${new Date().getFullYear()}`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
