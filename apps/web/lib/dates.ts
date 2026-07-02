export type DateRangeKey = "weekend" | "7" | "30" | "60";

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  weekend: "Weekend",
  "7": "7 giorni",
  "30": "30 giorni",
  "60": "60 giorni",
};

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Finestra {from,to} per una scelta di data. */
export function dateRange(key: DateRangeKey): { from: string; to: string } {
  const now = new Date();
  if (key === "weekend") {
    const day = now.getDay(); // 0 dom .. 6 sab
    const toFri = (5 - day + 7) % 7; // giorni fino al prossimo venerdì (0 se oggi è ven)
    const fri = new Date(now);
    fri.setDate(now.getDate() + toFri);
    const sun = new Date(fri);
    sun.setDate(fri.getDate() + 2);
    return { from: iso(fri), to: iso(sun) };
  }
  const days = key === "7" ? 7 : key === "30" ? 30 : 60;
  const to = new Date(now);
  to.setDate(now.getDate() + days);
  return { from: iso(now), to: iso(to) };
}
