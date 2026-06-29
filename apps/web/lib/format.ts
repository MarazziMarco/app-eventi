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
