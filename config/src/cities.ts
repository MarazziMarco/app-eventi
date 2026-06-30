import { haversineKm } from "@eventi/core";

/**
 * Elenco città italiane (capoluoghi + poli eventi) con coordinate.
 * Serve a "usa la mia posizione": il raggio diventa "città entro X km",
 * così da un paese piccolo peschi gli eventi dei centri vicini (es. Roma).
 */
/** `weight` ~ dimensione/scena eventi della città (più alto = più grande). */
export type CityPoint = { name: string; lat: number; lng: number; weight: number };

export const IT_CITIES: CityPoint[] = [
  { name: "Roma", lat: 41.9028, lng: 12.4964, weight: 100 },
  { name: "Milano", lat: 45.4642, lng: 9.19, weight: 100 },
  { name: "Napoli", lat: 40.8518, lng: 14.2681, weight: 90 },
  { name: "Torino", lat: 45.0703, lng: 7.6869, weight: 85 },
  { name: "Palermo", lat: 38.1157, lng: 13.3615, weight: 80 },
  { name: "Bologna", lat: 44.4949, lng: 11.3426, weight: 80 },
  { name: "Firenze", lat: 43.7696, lng: 11.2558, weight: 78 },
  { name: "Genova", lat: 44.4056, lng: 8.9463, weight: 72 },
  { name: "Bari", lat: 41.1171, lng: 16.8719, weight: 68 },
  { name: "Venezia", lat: 45.4408, lng: 12.3155, weight: 66 },
  { name: "Catania", lat: 37.5079, lng: 15.083, weight: 64 },
  { name: "Verona", lat: 45.4384, lng: 10.9916, weight: 62 },
  { name: "Rimini", lat: 44.0678, lng: 12.5695, weight: 60 },
  { name: "Cagliari", lat: 39.2238, lng: 9.1217, weight: 58 },
  { name: "Padova", lat: 45.4064, lng: 11.8768, weight: 56 },
  { name: "Brescia", lat: 45.5416, lng: 10.2118, weight: 52 },
  { name: "Perugia", lat: 43.1107, lng: 12.3908, weight: 50 },
  { name: "Pisa", lat: 43.7228, lng: 10.4017, weight: 48 },
  { name: "Bergamo", lat: 45.6983, lng: 9.6773, weight: 47 },
  { name: "Pescara", lat: 42.4618, lng: 14.2161, weight: 46 },
  { name: "Lecce", lat: 40.3515, lng: 18.175, weight: 45 },
  { name: "Siena", lat: 43.3188, lng: 11.3308, weight: 42 },
  { name: "Latina", lat: 41.4677, lng: 12.9037, weight: 40 },
  { name: "Terni", lat: 42.5636, lng: 12.6427, weight: 37 },
  { name: "Viterbo", lat: 42.4207, lng: 12.1077, weight: 36 },
];

/**
 * Le città PIÙ GRANDI entro `radiusKm` dal punto (max `max`).
 * Usato per "la mia posizione": il raggio diventa "i centri principali entro
 * X km" — privilegia le città grandi (dove sono gli eventi hype), non le più
 * vicine in assoluto.
 */
export function nearbyCities(
  lat: number,
  lng: number,
  radiusKm: number,
  max = 5,
): string[] {
  return IT_CITIES.map((c) => ({ c, d: haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng }) }))
    .filter((x) => x.d <= radiusKm)
    .sort((a, b) => b.c.weight - a.c.weight)
    .slice(0, max)
    .map((x) => x.c.name);
}
