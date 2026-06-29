import type { GeoQuery } from "@eventi/core";

/** Default Fase 1: raggio 30km, finestra oggi → +60 giorni, IT/it. */
export function buildGeoQuery(params: URLSearchParams): GeoQuery {
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radiusKm = Number(params.get("radius") ?? "30") || 30;

  const now = new Date();
  const plus60 = new Date(now);
  plus60.setDate(plus60.getDate() + 60);

  const from = params.get("from") ?? now.toISOString().slice(0, 10);
  const to = params.get("to") ?? plus60.toISOString().slice(0, 10);
  const cityLabel = params.get("city") ?? undefined;

  return {
    lat,
    lng,
    radiusKm,
    from,
    to,
    country: "it",
    lang: "it",
    ...(cityLabel ? { cityLabel } : {}),
  };
}

export function isValidLatLng(q: GeoQuery): boolean {
  return Number.isFinite(q.lat) && Number.isFinite(q.lng);
}
