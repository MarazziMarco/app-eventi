import { cached } from "@eventi/core";
import { fetchJson } from "./http";

/**
 * Reverse-geocoding coordinate -> città, via Nominatim (OpenStreetMap, free,
 * nessuna chiave). Serve a "usa la mia posizione": SerpApi/RA cercano per città,
 * non per lat/lng. Cache lunga (la città di un punto non cambia) + User-Agent
 * come richiesto dalla policy Nominatim.
 */

type NominatimResp = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
  };
};

export async function reverseGeocodeCity(lat: number, lng: number): Promise<string | undefined> {
  // arrotonda (~1km) per massimizzare gli hit di cache
  const key = `geocode:${lat.toFixed(2)},${lng.toFixed(2)}`;
  try {
    const data = await cached<NominatimResp>(
      key,
      () =>
        fetchJson<NominatimResp>(
          `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lng}`,
          { headers: { "User-Agent": "EventiApp/1.0 (personal use)" }, timeoutMs: 8000 },
        ),
      30 * 24 * 3600,
    );
    const a = data.address;
    return a?.city ?? a?.town ?? a?.village ?? a?.municipality ?? a?.county;
  } catch {
    return undefined; // best-effort: senza città si prosegue lo stesso
  }
}
