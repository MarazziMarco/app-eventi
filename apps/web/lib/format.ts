import type { Event } from "@eventi/core";

/** Data ISO -> "12 lug 2026" in italiano. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

/** Orario "HH:MM" se significativo (non mezzanotte = data senza ora nota). */
export function fmtTime(iso: string): string | undefined {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const hh = d.getHours();
  const mm = d.getMinutes();
  if (hh === 0 && mm === 0) return undefined;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Link mappa: coordinate se presenti, altrimenti ricerca per nome venue + città. */
export function mapUrl(ev: Pick<Event, "venue" | "city">): string {
  const { lat, lng, name } = ev.venue;
  if (lat !== undefined && lng !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const q = [name, cleanCity(ev.city)].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  concert: "concerto",
  festival: "festival",
  sport: "sport",
  nightlife: "nightlife",
  expo: "mostra",
  other: "evento",
};

export function categoryLabel(c: string): string {
  return CATEGORY_LABEL[c] ?? c;
}

/**
 * Pulisce la città verbosa di Google/SerpApi:
 *   "Fabrica di Roma, Province of Viterbo, Italy" -> "Fabrica di Roma · Viterbo"
 * Mostrare la provincia chiarisce dove si trova (es. comuni col nome ingannevole).
 */
export function cleanCity(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((p) => p.trim());
  const town = parts[0];
  if (!town) return undefined;
  const provincePart = parts.find((p) => /province of/i.test(p));
  const province = provincePart?.replace(/province of/i, "").trim();
  if (province && province.toLowerCase() !== town.toLowerCase()) {
    return `${town} · ${province}`;
  }
  return town;
}
