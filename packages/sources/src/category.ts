import type { Category } from "@eventi/core";

/** Inferisce la categoria da testo libero (titolo + eventuali tag/segment). */
export function inferCategory(text: string): Category {
  const t = text.toLowerCase();
  if (/(festival|fest\b|sonar|coachella|primavera sound)/.test(t)) return "festival";
  if (/(calcio|partita|atp|wta|tennis|basket|volley|moto|formula|gp\b|rugby|nba|serie a|champions)/.test(t))
    return "sport";
  if (/(dj set|clubbing|night|nightlife|after|rave|discoteca|techno|house party)/.test(t))
    return "nightlife";
  if (/(mostra|expo|fiera|exhibition|museo)/.test(t)) return "expo";
  if (/(concerto|concert|live|tour|in concerto|world tour)/.test(t)) return "concert";
  return "other";
}

/** Mappa il segment Ticketmaster nella nostra categoria. */
export function categoryFromTmSegment(segment: string | undefined, title: string): Category {
  switch ((segment ?? "").toLowerCase()) {
    case "music":
      return inferCategory(title) === "festival" ? "festival" : "concert";
    case "sports":
      return "sport";
    case "arts & theatre":
      return inferCategory(title);
    default:
      return inferCategory(title);
  }
}
