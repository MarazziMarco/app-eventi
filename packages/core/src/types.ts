/* ------------------------------------------------------------------ */
/* Schema dominio                                                      */
/* ------------------------------------------------------------------ */

export type Category =
  | "concert"
  | "festival"
  | "sport"
  | "nightlife"
  | "expo"
  | "other";

export type CapacityTier = 0 | 1 | 2 | 3;

export type Venue = {
  name?: string;
  lat?: number;
  lng?: number;
  capacityTier?: CapacityTier;
};

export type TicketSource = {
  name: string;
  url: string;
  price?: number;
};

export type Artist = {
  name: string;
  spotifyPopularity?: number; // 0-100
  spotifyFollowers?: number;
};

/** Evento normalizzato e arricchito (output del pipeline). */
export type Event = {
  /** hash stabile da (title|date|cityOrVenue) */
  id: string;
  /** fonti che hanno contribuito, es. ["google_events","ticketmaster"] */
  sources: string[];
  title: string;
  category: Category;
  start: string; // ISO
  end?: string;
  venue: Venue;
  city?: string;
  url: string; // miglior link
  ticketSources: TicketSource[];
  image?: string;
  artist?: Artist;
  soldOut?: boolean;
  /** 0-100 da PredictHQ se presente */
  externalRank?: number;
  /** 0-100 calcolato da noi */
  hypeScore: number;
};

/**
 * Evento grezzo restituito da un adapter, PRIMA di dedup/ranking.
 * hypeScore non e' ancora calcolato (lo aggiunge il pipeline).
 */
export type RawEvent = Omit<Event, "hypeScore" | "id" | "sources"> & {
  /** la singola fonte che ha prodotto questo raw event */
  source: string;
  /** id gia' calcolabile a monte se l'adapter vuole, altrimenti lo fa il core */
  id?: string;
};

/* ------------------------------------------------------------------ */
/* Query geografica / temporale                                        */
/* ------------------------------------------------------------------ */

export type GeoQuery = {
  lat: number;
  lng: number;
  /** raggio in km (default applicato a monte) */
  radiusKm: number;
  /** finestra temporale ISO (date) */
  from: string;
  to: string;
  country?: string; // es. "it"
  lang?: string; // es. "it"
  /** etichetta citta' utile per fonti che cercano per nome (es. SerpApi) */
  cityLabel?: string;
};

/* ------------------------------------------------------------------ */
/* Interfaccia comune delle fonti (adapter pluggabili)                 */
/* ------------------------------------------------------------------ */

export interface EventSource {
  /** id stabile, es. "google_events" */
  readonly id: string;
  /** true se le env var necessarie sono presenti */
  isConfigured(): boolean;
  fetchEvents(query: GeoQuery): Promise<RawEvent[]>;
}

/* ------------------------------------------------------------------ */
/* Config injection (i valori concreti vivono in @eventi/config)       */
/* ------------------------------------------------------------------ */

export interface RankingConfig {
  weights: {
    capacity: number;
    artistPopularity: number;
    category: number;
    demand: number;
  };
  capacityTierScore: Record<CapacityTier, number>;
  categoryWeight: Record<Category, number>;
  /** quanto pesa externalRank (PredictHQ) nel blend finale, 0..1 */
  externalRankBlend: number;
}

export interface SelectionConfig {
  showAllThreshold: number;
  topPercent: number;
  minHype: number;
}
