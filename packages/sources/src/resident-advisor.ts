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
