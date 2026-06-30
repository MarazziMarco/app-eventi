/**
 * Base URL dell'API. Vuoto sul web (stesso origin); nell'app Capacitor punta
 * al deploy Vercel via NEXT_PUBLIC_API_BASE (inlined a build time da Next).
 */
export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");
}

export type EventsParams = { lat: number; lng: number; city?: string; radiusKm?: number };

/** URL completo per GET /api/events con i parametri dati. */
export function eventsUrl(p: EventsParams): string {
  const qs = new URLSearchParams({ lat: String(p.lat), lng: String(p.lng) });
  if (p.city) qs.set("city", p.city);
  if (p.radiusKm) qs.set("radius", String(p.radiusKm));
  return `${apiBase()}/api/events?${qs.toString()}`;
}
