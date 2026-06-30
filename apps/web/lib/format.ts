/** Data ISO -> "12 lug 2026" in italiano. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
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
