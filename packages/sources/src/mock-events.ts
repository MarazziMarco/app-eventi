import { resolveCapacityTier } from "@eventi/config";
import type { EventSource, GeoQuery, RawEvent } from "@eventi/core";
import { withinRadius } from "@eventi/core";

/**
 * Fixture mock realistiche: Roma (denso) + Viterbo (sparso).
 * Servono a far girare test, `pnpm validate` e UI ANCHE SENZA NESSUNA CHIAVE API.
 * Con le chiavi presenti si usano i dati veri; senza, il pipeline fa fallback qui.
 * Mai crashare per chiave mancante.
 */

/** data ISO a +`days` da oggi, ora 20:00 (sempre dentro la finestra di default). */
function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(20, 0, 0, 0);
  return d.toISOString();
}

type MockSpec = Omit<RawEvent, "source" | "venue"> & {
  venue: Omit<NonNullable<RawEvent["venue"]>, "capacityTier">;
};

function mock(spec: MockSpec): RawEvent {
  return {
    source: "mock",
    ...spec,
    venue: { ...spec.venue, capacityTier: resolveCapacityTier(spec.venue.name) },
  };
}

/** Costruisce le fixture (date dinamiche, sempre in finestra). */
export function buildMockEvents(): RawEvent[] {
  return [
    // ───────── Roma — zona densa (lat ~41.90, lng ~12.49) ─────────
    mock({
      title: "Coldplay - Music of the Spheres",
      category: "concert",
      start: inDays(20),
      venue: { name: "Stadio Olimpico", lat: 41.9339, lng: 12.4547 },
      city: "Roma",
      url: "https://example.com/coldplay",
      ticketSources: [
        { name: "ticketone", url: "https://t1/coldplay", price: 75 },
        { name: "ticketmaster", url: "https://tm/coldplay" },
      ],
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600",
      artist: { name: "Coldplay", spotifyPopularity: 92, spotifyFollowers: 48_000_000 },
      soldOut: true,
    }),
    mock({
      title: "Internazionali BNL d'Italia - Finale",
      category: "sport",
      start: inDays(12),
      venue: { name: "Foro Italico", lat: 41.9295, lng: 12.4561 },
      city: "Roma",
      url: "https://example.com/bnl",
      ticketSources: [{ name: "vivaticket", url: "https://vv/bnl", price: 90 }],
      image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600",
    }),
    mock({
      title: "Ultimo - Stadi 2026",
      category: "concert",
      start: inDays(35),
      venue: { name: "Stadio Olimpico", lat: 41.9339, lng: 12.4547 },
      city: "Roma",
      url: "https://example.com/ultimo",
      ticketSources: [{ name: "ticketone", url: "https://t1/ultimo", price: 65 }],
      image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600",
      artist: { name: "Ultimo", spotifyPopularity: 74, spotifyFollowers: 2_300_000 },
    }),
    mock({
      title: "Marracash - Europa Tour",
      category: "concert",
      start: inDays(28),
      venue: { name: "Palazzo dello Sport", lat: 41.8289, lng: 12.4665 },
      city: "Roma",
      url: "https://example.com/marra",
      ticketSources: [{ name: "ticketone", url: "https://t1/marra", price: 55 }],
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600",
      artist: { name: "Marracash", spotifyPopularity: 78, spotifyFollowers: 1_900_000 },
    }),
    mock({
      title: "Notte techno @ Goa Club",
      category: "nightlife",
      start: inDays(5),
      venue: { name: "Goa Club", lat: 41.8632, lng: 12.4895 },
      city: "Roma",
      url: "https://example.com/goa",
      ticketSources: [{ name: "dice", url: "https://dice/goa", price: 20 }],
      image: "https://images.unsplash.com/photo-1571266028243-371fdc47b1b2?w=600",
    }),
    mock({
      title: "Concerto di Capodanno - Circo Massimo",
      category: "concert",
      start: inDays(40),
      venue: { name: "Circo Massimo", lat: 41.8859, lng: 12.4853 },
      city: "Roma",
      url: "https://example.com/circo",
      ticketSources: [{ name: "ticketone", url: "https://t1/circo" }],
      image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600",
      artist: { name: "Various", spotifyPopularity: 40 },
    }),
    mock({
      title: "Roma vs Lazio - Derby",
      category: "sport",
      start: inDays(18),
      venue: { name: "Stadio Olimpico", lat: 41.9339, lng: 12.4547 },
      city: "Roma",
      url: "https://example.com/derby",
      ticketSources: [{ name: "vivaticket", url: "https://vv/derby", price: 45 }],
      image: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=600",
      soldOut: true,
    }),
    mock({
      title: "Mostra Caravaggio",
      category: "expo",
      start: inDays(8),
      venue: { name: "Scuderie del Quirinale", lat: 41.8989, lng: 12.4869 },
      city: "Roma",
      url: "https://example.com/caravaggio",
      ticketSources: [{ name: "coopculture", url: "https://cc/cara", price: 18 }],
      image: "https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=600",
    }),
    mock({
      title: "Tedua live @ Atlantico",
      category: "concert",
      start: inDays(22),
      venue: { name: "Atlantico", lat: 41.8312, lng: 12.4711 },
      city: "Roma",
      url: "https://example.com/tedua",
      ticketSources: [{ name: "ticketone", url: "https://t1/tedua", price: 38 }],
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600",
      artist: { name: "Tedua", spotifyPopularity: 71, spotifyFollowers: 1_500_000 },
    }),
    // long-tail Roma: roba minore che il filtro deve TAGLIARE
    mock({
      title: "Open mic acustico",
      category: "concert",
      start: inDays(6),
      venue: { name: "Locale Piccolo", lat: 41.9, lng: 12.5 },
      city: "Roma",
      url: "https://example.com/openmic",
      ticketSources: [],
      artist: { name: "Vari", spotifyPopularity: 8 },
    }),
    mock({
      title: "Spettacolo teatrale minore",
      category: "other",
      start: inDays(9),
      venue: { name: "Teatro di Quartiere", lat: 41.91, lng: 12.51 },
      city: "Roma",
      url: "https://example.com/teatro",
      ticketSources: [{ name: "boxol", url: "https://bx/teatro", price: 12 }],
    }),
    mock({
      title: "Serata jazz club",
      category: "concert",
      start: inDays(11),
      venue: { name: "Jazz Corner", lat: 41.89, lng: 12.47 },
      city: "Roma",
      url: "https://example.com/jazz",
      ticketSources: [{ name: "dice", url: "https://dice/jazz", price: 15 }],
      artist: { name: "Trio X", spotifyPopularity: 22 },
    }),
    mock({
      title: "Presentazione libro",
      category: "other",
      start: inDays(7),
      venue: { name: "Libreria Centrale", lat: 41.902, lng: 12.49 },
      city: "Roma",
      url: "https://example.com/libro",
      ticketSources: [],
    }),
    mock({
      title: "Stand-up comedy night",
      category: "other",
      start: inDays(14),
      venue: { name: "Comedy Club", lat: 41.895, lng: 12.485 },
      city: "Roma",
      url: "https://example.com/comedy",
      ticketSources: [{ name: "dice", url: "https://dice/comedy", price: 16 }],
    }),

    // ───────── Viterbo — zona sparsa (lat ~42.42, lng ~12.11) ─────────
    mock({
      title: "Tuscia in Jazz Festival",
      category: "festival",
      start: inDays(25),
      venue: { name: "Tuscia in Jazz", lat: 42.4175, lng: 12.1045 },
      city: "Viterbo",
      url: "https://example.com/tuscia",
      ticketSources: [{ name: "ticketone", url: "https://t1/tuscia", price: 25 }],
      image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600",
      artist: { name: "Various Jazz", spotifyPopularity: 35 },
    }),
    mock({
      title: "Caffeina Festival - serata evento",
      category: "festival",
      start: inDays(30),
      venue: { name: "Piazza San Lorenzo", lat: 42.4189, lng: 12.1043 },
      city: "Viterbo",
      url: "https://example.com/caffeina",
      ticketSources: [],
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600",
    }),
    mock({
      title: "Concerto al Teatro dell'Unione",
      category: "concert",
      start: inDays(16),
      venue: { name: "Teatro dell'Unione", lat: 42.4201, lng: 12.1067 },
      city: "Viterbo",
      url: "https://example.com/unione",
      ticketSources: [{ name: "vivaticket", url: "https://vv/unione", price: 22 }],
      artist: { name: "Orchestra locale", spotifyPopularity: 18 },
    }),
    mock({
      title: "Sagra con musica dal vivo",
      category: "other",
      start: inDays(10),
      venue: { name: "Centro Storico", lat: 42.4215, lng: 12.108 },
      city: "Viterbo",
      url: "https://example.com/sagra",
      ticketSources: [],
    }),
  ];
}

/**
 * Fonte mock: usata come fallback dal pipeline quando nessuna fonte reale
 * restituisce eventi (es. zero chiavi configurate). Filtra per raggio cosi'
 * la query Roma vede gli eventi di Roma e quella Viterbo quelli di Viterbo.
 */
export class MockSource implements EventSource {
  readonly id = "mock";

  isConfigured(): boolean {
    return true;
  }

  async fetchEvents(q: GeoQuery): Promise<RawEvent[]> {
    return buildMockEvents().filter((e) =>
      withinRadius({ lat: q.lat, lng: q.lng }, e.venue, q.radiusKm),
    );
  }
}
