import { cached, type Event } from "@eventi/core";
import { fetchJson } from "./http";

/**
 * Deezer come SEGNALE DI RANKING (rimpiazza Spotify, che ora richiede Premium).
 * API pubblica, gratis, senza chiave/login: per ogni artista prende `nb_fan`
 * (numero di fan) e lo mappa in una popolarità 0-100. Popola i campi
 * artist.spotifyPopularity / spotifyFollowers (riusati come "segnale
 * popolarità", a prescindere dalla fonte) così il ranking non cambia.
 */

type DeezerArtist = { name: string; nb_fan?: number };
type DeezerSearch = { data?: DeezerArtist[] };

/** nb_fan -> popolarità 0-100 (scala logaritmica: i fan crescono a ordini di grandezza). */
export function fanToPopularity(nbFan: number): number {
  if (nbFan <= 0) return 0;
  // log10(15M) ~= 7.18 -> ~96; 1M -> ~80; 100k -> ~67; 10k -> ~53
  const p = Math.round((Math.log10(nbFan + 1) / 7.5) * 100);
  return Math.max(0, Math.min(100, p));
}

async function lookupArtist(
  name: string,
): Promise<{ popularity: number; fans: number } | undefined> {
  const url = `https://api.deezer.com/search/artist?limit=1&q=${encodeURIComponent(name)}`;
  const data = await cached<DeezerSearch>(
    `deezer:artist:${name.toLowerCase()}`,
    () => fetchJson<DeezerSearch>(url),
    7 * 24 * 3600, // popolarità cambia lentamente: cache 7 giorni
  );
  const top = data.data?.[0];
  if (!top || top.nb_fan === undefined) return undefined;
  return { popularity: fanToPopularity(top.nb_fan), fans: top.nb_fan };
}

/**
 * Arricchisce (immutabile) gli eventi musicali con la popolarità Deezer.
 * Un solo lookup per nome artista distinto. Errori ignorati (segnale opzionale).
 */
export async function enrichWithDeezer(events: Event[]): Promise<Event[]> {
  const names = new Set(
    events.map((e) => e.artist?.name).filter((n): n is string => Boolean(n)),
  );
  const byName = new Map<string, { popularity: number; fans: number }>();

  await Promise.all(
    [...names].map(async (name) => {
      try {
        const info = await lookupArtist(name);
        if (info) byName.set(name, info);
      } catch {
        /* segnale opzionale: non bloccare il resto */
      }
    }),
  );

  return events.map((e) => {
    if (!e.artist?.name) return e;
    const info = byName.get(e.artist.name);
    if (!info) return e;
    return {
      ...e,
      artist: { ...e.artist, spotifyPopularity: info.popularity, spotifyFollowers: info.fans },
    };
  });
}
