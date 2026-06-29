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
