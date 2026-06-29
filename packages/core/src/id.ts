import { createHash } from "node:crypto";

/** Normalizza un titolo per id/dedup: lowercase, no accenti, no punteggiatura. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Giorno (YYYY-MM-DD) da una data ISO. Usato per id/dedup. */
export function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Id stabile da (titolo normalizzato | giorno | venue-o-citta').
 * Eventi "uguali" da fonti diverse producono lo stesso id => dedup naturale.
 */
export function stableId(input: {
  title: string;
  start: string;
  venueName?: string;
  city?: string;
}): string {
  const place = (input.venueName ?? input.city ?? "").toLowerCase().trim();
  const basis = `${normalizeTitle(input.title)}|${dayOf(input.start)}|${place}`;
  return createHash("sha1").update(basis).digest("hex").slice(0, 16);
}
