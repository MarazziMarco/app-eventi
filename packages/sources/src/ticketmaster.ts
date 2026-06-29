import { resolveCapacityTier } from "@eventi/config";
import { cached, type EventSource, type GeoQuery, type RawEvent } from "@eventi/core";
import { categoryFromTmSegment } from "./category";
import { fetchJson } from "./http";

/**
 * Ticketmaster Discovery API — base gratis e ufficiale (~5000 call/giorno).
 * Copre tour internazionali e grandi eventi che passano da Ticketmaster.
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";

type TmImage = { url: string; width: number; ratio?: string };
type TmVenue = {
  name?: string;
  city?: { name?: string };
  location?: { latitude?: string; longitude?: string };
};
type TmEvent = {
  name: string;
  url: string;
  images?: TmImage[];
  dates?: { start?: { dateTime?: string; localDate?: string } };
  classifications?: { segment?: { name?: string } }[];
  priceRanges?: { min?: number }[];
  _embedded?: { venues?: TmVenue[]; attractions?: { name?: string }[] };
};
type TmResponse = { _embedded?: { events?: TmEvent[] } };

export class TicketmasterSource implements EventSource {
  readonly id = "ticketmaster";

  isConfigured(): boolean {
    return Boolean(process.env.TICKETMASTER_KEY);
  }

  async fetchEvents(q: GeoQuery): Promise<RawEvent[]> {
    if (!this.isConfigured()) return [];
    const key = process.env.TICKETMASTER_KEY!;
    const params = new URLSearchParams({
      apikey: key,
      latlong: `${q.lat},${q.lng}`,
      radius: String(Math.round(q.radiusKm)),
      unit: "km",
      startDateTime: toTmDate(q.from, "00:00:00"),
      endDateTime: toTmDate(q.to, "23:59:59"),
      countryCode: (q.country ?? "it").toUpperCase(),
      size: "100",
      sort: "date,asc",
      locale: "*",
    });
    const url = `${BASE}?${params.toString()}`;

    // TTL standard (default 6h): TM e' generoso sui limiti.
    const data = await cached<TmResponse>(`tm:${q.lat},${q.lng},${q.from},${q.to}`, () =>
      fetchJson<TmResponse>(url),
    );

    const events = data._embedded?.events ?? [];
    return events.map((e) => this.normalize(e));
  }

  private normalize(e: TmEvent): RawEvent {
    const venue = e._embedded?.venues?.[0];
    const attraction = e._embedded?.attractions?.[0]?.name;
    const segment = e.classifications?.[0]?.segment?.name;
    const category = categoryFromTmSegment(segment, e.name);
    const start = e.dates?.start?.dateTime ?? `${e.dates?.start?.localDate ?? ""}T20:00:00.000Z`;
    const lat = venue?.location?.latitude ? Number(venue.location.latitude) : undefined;
    const lng = venue?.location?.longitude ? Number(venue.location.longitude) : undefined;
    const price = e.priceRanges?.[0]?.min;

    return {
      source: this.id,
      title: e.name,
      category,
      start,
      venue: {
        ...(venue?.name ? { name: venue.name } : {}),
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
        capacityTier: resolveCapacityTier(venue?.name),
      },
      ...(venue?.city?.name ? { city: venue.city.name } : {}),
      url: e.url,
      ticketSources: [{ name: "ticketmaster", url: e.url, ...(price !== undefined ? { price } : {}) }],
      ...(bestTmImage(e.images) ? { image: bestTmImage(e.images)! } : {}),
      // per eventi musicali l'attraction = artista; Spotify lo arricchira' dopo
      ...(category === "concert" || category === "festival"
        ? { artist: { name: attraction ?? e.name } }
        : {}),
    };
  }
}

function bestTmImage(images: TmImage[] | undefined): string | undefined {
  if (!images?.length) return undefined;
  const wide = images
    .filter((i) => i.ratio === "16_9")
    .sort((a, b) => b.width - a.width)[0];
  return (wide ?? images.sort((a, b) => b.width - a.width)[0])?.url;
}

/** "2026-06-29" -> "2026-06-29T00:00:00Z" nel formato richiesto da TM. */
function toTmDate(isoDate: string, time: string): string {
  return `${isoDate.slice(0, 10)}T${time}Z`;
}
