/** Distanza haversine in km fra due punti lat/lng. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** true se l'evento (con coordinate venue) e' entro `radiusKm` dal centro. */
export function withinRadius(
  center: { lat: number; lng: number },
  point: { lat?: number; lng?: number },
  radiusKm: number,
): boolean {
  // se mancano le coordinate non possiamo escludere -> teniamo l'evento
  if (point.lat === undefined || point.lng === undefined) return true;
  return haversineKm(center, { lat: point.lat, lng: point.lng }) <= radiusKm;
}

/** true se la data ISO cade nella finestra [from, to] (inclusivo per giorno). */
export function withinWindow(startIso: string, from: string, to: string): boolean {
  const d = startIso.slice(0, 10);
  return d >= from.slice(0, 10) && d <= to.slice(0, 10);
}
