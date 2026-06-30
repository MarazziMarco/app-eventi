import { haversineKm } from "@eventi/core";

/**
 * Elenco città italiane (capoluoghi + poli eventi) con coordinate.
 * Serve a "usa la mia posizione": il raggio diventa "città entro X km",
 * così da un paese piccolo peschi gli eventi dei centri vicini (es. Roma).
 */
export type CityPoint = { name: string; lat: number; lng: number };

export const IT_CITIES: CityPoint[] = [
  { name: "Roma", lat: 41.9028, lng: 12.4964 },
  { name: "Viterbo", lat: 42.4207, lng: 12.1077 },
  { name: "Latina", lat: 41.4677, lng: 12.9037 },
  { name: "Terni", lat: 42.5636, lng: 12.6427 },
  { name: "Perugia", lat: 43.1107, lng: 12.3908 },
  { name: "Siena", lat: 43.3188, lng: 11.3308 },
  { name: "Firenze", lat: 43.7696, lng: 11.2558 },
  { name: "Pisa", lat: 43.7228, lng: 10.4017 },
  { name: "Bologna", lat: 44.4949, lng: 11.3426 },
  { name: "Rimini", lat: 44.0678, lng: 12.5695 },
  { name: "Pescara", lat: 42.4618, lng: 14.2161 },
  { name: "Milano", lat: 45.4642, lng: 9.19 },
  { name: "Bergamo", lat: 45.6983, lng: 9.6773 },
  { name: "Brescia", lat: 45.5416, lng: 10.2118 },
  { name: "Verona", lat: 45.4384, lng: 10.9916 },
  { name: "Padova", lat: 45.4064, lng: 11.8768 },
  { name: "Venezia", lat: 45.4408, lng: 12.3155 },
  { name: "Torino", lat: 45.0703, lng: 7.6869 },
  { name: "Genova", lat: 44.4056, lng: 8.9463 },
  { name: "Napoli", lat: 40.8518, lng: 14.2681 },
  { name: "Bari", lat: 41.1171, lng: 16.8719 },
  { name: "Lecce", lat: 40.3515, lng: 18.1750 },
  { name: "Palermo", lat: 38.1157, lng: 13.3615 },
  { name: "Catania", lat: 37.5079, lng: 15.083 },
  { name: "Cagliari", lat: 39.2238, lng: 9.1217 },
];

/**
 * Città entro `radiusKm` dal punto, dalla più vicina, max `max`.
 * Usato per espandere "la mia posizione" sulle città circostanti.
 */
export function nearbyCities(
  lat: number,
  lng: number,
  radiusKm: number,
  max = 5,
): string[] {
  return IT_CITIES.map((c) => ({ c, d: haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng }) }))
    .filter((x) => x.d <= radiusKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map((x) => x.c.name);
}
