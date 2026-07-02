/**
 * Geocoding lato client dei venue senza coordinate (molti eventi SerpApi non
 * le hanno), via Nominatim (OpenStreetMap, free, no chiave). Coda sequenziale
 * (~1 req/s come da policy Nominatim) + cache in localStorage per non ripetere.
 */

export type LatLng = { lat: number; lng: number };

const CACHE_PREFIX = "geo:v1:";
type CacheEntry = { ll: LatLng | null };

function readCache(key: string): CacheEntry | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as CacheEntry) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, entry: CacheEntry): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* ignora */
  }
}

// coda sequenziale: una richiesta Nominatim alla volta, distanziate.
let chain: Promise<unknown> = Promise.resolve();
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function nominatimSearch(query: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query,
  )}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat: string; lon: string }[];
    const first = arr[0];
    if (!first) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
  } catch {
    return null;
  }
}

/**
 * Coordinate per un venue (nome + città). Usa la cache; altrimenti accoda una
 * richiesta Nominatim. Ritorna null se non trovato.
 */
export function geocodeVenue(name: string, city?: string): Promise<LatLng | null> {
  const q = [name, city, "Italia"].filter(Boolean).join(", ");
  const key = q.toLowerCase();

  const cached = readCache(key);
  if (cached) return Promise.resolve(cached.ll);

  const task = chain.then(async () => {
    // ricontrolla la cache (potrebbe averla riempita un task in coda)
    const again = readCache(key);
    if (again) return again.ll;
    const ll = await nominatimSearch(q);
    writeCache(key, { ll });
    await sleep(1100); // rispetta ~1 req/s
    return ll;
  });
  chain = task.catch(() => undefined);
  return task;
}
