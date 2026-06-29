import { cached, type Event } from "@eventi/core";
import { fetchJson } from "./http";

/**
 * Spotify Web API — NON e' una fonte eventi: e' un SEGNALE DI RANKING.
 * Per ogni evento musicale arricchisce artist.spotifyPopularity (0-100) e
 * spotifyFollowers, che poi pesano nell'hypeScore.
 * Auth: Client Credentials flow (gratis, nessun utente).
 */

type TokenResp = { access_token: string; expires_in: number };
type SearchResp = {
  artists?: { items?: { name: string; popularity: number; followers?: { total: number } }[] };
};

export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

let tokenCache: { token: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token HTTP ${res.status}`);
  const data = (await res.json()) as TokenResp;
  tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

async function lookupArtist(
  name: string,
): Promise<{ popularity: number; followers: number } | undefined> {
  const token = await getToken();
  const url = `https://api.spotify.com/v1/search?type=artist&limit=1&q=${encodeURIComponent(name)}`;
  const data = await cached<SearchResp>(
    `spotify:artist:${name.toLowerCase()}`,
    () => fetchJson<SearchResp>(url, { headers: { Authorization: `Bearer ${token}` } }),
    7 * 24 * 3600, // popolarita' cambia lentamente: cache 7 giorni
  );
  const top = data.artists?.items?.[0];
  if (!top) return undefined;
  return { popularity: top.popularity, followers: top.followers?.total ?? 0 };
}

/**
 * Arricchisce in-place (immutabile) gli eventi musicali con i dati Spotify.
 * Se Spotify non e' configurato o fallisce, ritorna gli eventi invariati.
 */
export async function enrichWithSpotify(events: Event[]): Promise<Event[]> {
  if (!isSpotifyConfigured()) return events;

  // un solo lookup per nome artista distinto
  const names = new Set(
    events.map((e) => e.artist?.name).filter((n): n is string => Boolean(n)),
  );
  const byName = new Map<string, { popularity: number; followers: number }>();

  await Promise.all(
    [...names].map(async (name) => {
      try {
        const info = await lookupArtist(name);
        if (info) byName.set(name, info);
      } catch {
        // fonte segnale opzionale: ignora errori per non bloccare il resto
      }
    }),
  );

  return events.map((e) => {
    if (!e.artist?.name) return e;
    const info = byName.get(e.artist.name);
    if (!info) return e;
    return {
      ...e,
      artist: { ...e.artist, spotifyPopularity: info.popularity, spotifyFollowers: info.followers },
    };
  });
}
