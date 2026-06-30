import { dayOf, normalizeTitle, stableId } from "./id";
import type { Artist, Category, Event, RawEvent, TicketSource, Venue } from "./types";

/** Similarita' fra titoli via Jaccard sui token normalizzati (0..1). */
export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeTitle(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

const TITLE_SIM_THRESHOLD = 0.6;

function placeMatches(a: RawEvent, b: RawEvent): boolean {
  const va = a.venue.name?.toLowerCase().trim();
  const vb = b.venue.name?.toLowerCase().trim();
  if (va && vb) return titleSimilarity(va, vb) >= 0.5;
  const ca = a.city?.toLowerCase().trim();
  const cb = b.city?.toLowerCase().trim();
  if (ca && cb) return ca === cb;
  // uno dei due senza luogo: non blocca il merge (stesso titolo+giorno basta)
  return true;
}

/** true se due raw event rappresentano lo stesso evento reale. */
export function isSameEvent(a: RawEvent, b: RawEvent): boolean {
  if (dayOf(a.start) !== dayOf(b.start)) return false;
  if (titleSimilarity(a.title, b.title) < TITLE_SIM_THRESHOLD) return false;
  return placeMatches(a, b);
}

function mergeTicketSources(lists: TicketSource[][]): TicketSource[] {
  const byUrl = new Map<string, TicketSource>();
  for (const list of lists) {
    for (const ts of list) {
      const existing = byUrl.get(ts.url);
      if (!existing) byUrl.set(ts.url, ts);
      else if (existing.price === undefined && ts.price !== undefined) {
        byUrl.set(ts.url, { ...existing, price: ts.price });
      }
    }
  }
  return [...byUrl.values()];
}

function bestImage(raws: RawEvent[]): string | undefined {
  return raws.map((r) => r.image).find((i): i is string => Boolean(i));
}

function bestDescription(raws: RawEvent[]): string | undefined {
  // la descrizione piu' lunga (piu' informativa)
  return raws
    .map((r) => r.description)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => b.length - a.length)[0];
}

function bestUrl(raws: RawEvent[]): string {
  return raws.map((r) => r.url).find((u) => Boolean(u)) ?? "";
}

function bestVenue(raws: RawEvent[]): Venue {
  // preferisci il venue con coordinate, poi con capacityTier, poi con nome
  const withCoords = raws.find((r) => r.venue.lat !== undefined && r.venue.lng !== undefined);
  const base = withCoords?.venue ?? raws.find((r) => r.venue.name)?.venue ?? raws[0]!.venue;
  const tier = raws.map((r) => r.venue.capacityTier).find((t) => t !== undefined);
  const name = raws.map((r) => r.venue.name).find((n) => Boolean(n));
  return { ...base, ...(name ? { name } : {}), ...(tier !== undefined ? { capacityTier: tier } : {}) };
}

function bestArtist(raws: RawEvent[]): Artist | undefined {
  // preferisci l'artista con dati Spotify gia' presenti
  return (
    raws.map((r) => r.artist).find((a) => a?.spotifyPopularity !== undefined) ??
    raws.map((r) => r.artist).find((a): a is Artist => Boolean(a))
  );
}

function bestCategory(raws: RawEvent[]): Category {
  const nonOther = raws.map((r) => r.category).find((c) => c !== "other");
  return nonOther ?? "other";
}

/** Fonde un cluster di raw event nello stesso Event (hypeScore placeholder 0). */
function mergeCluster(raws: RawEvent[]): Event {
  const sources = [...new Set(raws.map((r) => r.source))];
  // start piu' "preciso" = il primo; manteniamo il minimo come canonical
  const start = raws.map((r) => r.start).sort()[0]!;
  const venue = bestVenue(raws);
  const city = raws.map((r) => r.city).find((c) => Boolean(c));
  const title = raws.map((r) => r.title).sort((a, b) => b.length - a.length)[0]!;
  const artist = bestArtist(raws);
  const externalRank = raws.map((r) => r.externalRank).find((x) => typeof x === "number");
  const end = raws.map((r) => r.end).find((e) => Boolean(e));

  return {
    id: stableId({ title, start, venueName: venue.name, city }),
    sources,
    title,
    category: bestCategory(raws),
    start,
    ...(end ? { end } : {}),
    venue,
    ...(city ? { city } : {}),
    url: bestUrl(raws),
    ticketSources: mergeTicketSources(raws.map((r) => r.ticketSources)),
    ...(bestImage(raws) ? { image: bestImage(raws)! } : {}),
    ...(bestDescription(raws) ? { description: bestDescription(raws)! } : {}),
    ...(artist ? { artist } : {}),
    ...(raws.some((r) => r.soldOut) ? { soldOut: true } : {}),
    ...(typeof externalRank === "number" ? { externalRank } : {}),
    hypeScore: 0,
  };
}

/**
 * Deduplica raw event da fonti diverse con fuzzy match su
 * (titolo normalizzato + giorno + venue/citta'). Restituisce Event[]
 * con sources/ticketSources uniti e hypeScore placeholder (0).
 */
export function dedupeEvents(raws: RawEvent[]): Event[] {
  const clusters: RawEvent[][] = [];
  for (const raw of raws) {
    const cluster = clusters.find((c) => c.some((existing) => isSameEvent(existing, raw)));
    if (cluster) cluster.push(raw);
    else clusters.push([raw]);
  }
  return clusters.map(mergeCluster);
}
