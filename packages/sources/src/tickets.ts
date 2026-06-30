import type { TicketSource } from "@eventi/core";

/**
 * Ordina/filtra i rivenditori biglietti per affidabilità:
 *   ufficiali (TicketOne, Ticketmaster, DICE, Vivaticket...) prima,
 *   rivendite secondarie (Viagogo, StubHub...) in fondo,
 *   junk noto (es. Aeroitalia) scartato.
 * Google Eventi aggrega tutto alla rinfusa: qui diamo un ordine sensato.
 */

const OFFICIAL = [
  "ticketone",
  "ticketmaster",
  "vivaticket",
  "dice",
  "mailticket",
  "ciaotickets",
  "ciao tickets",
  "boxol",
  "boxoffice",
  "eventbrite",
  "ticketsms",
  "liveticket",
  "etes",
  "oooh",
  "fansale",
  "resident advisor",
  "ra.co",
];

const RESALE = ["viagogo", "stubhub", "tickpick", "seatpick", "rateyourseats", "ticombo", "gigsberg"];

const JUNK = ["aeroitalia", "superfan", "rateyourseats"];

function tier(t: TicketSource): number {
  const hay = `${t.name} ${t.url}`.toLowerCase();
  if (JUNK.some((j) => hay.includes(j))) return 3; // scartato
  if (OFFICIAL.some((o) => hay.includes(o))) return 0;
  if (RESALE.some((r) => hay.includes(r))) return 2;
  return 1;
}

/** Ritorna i ticket source ordinati (ufficiali prima), senza junk, max `limit`. */
export function rankTicketSources(sources: TicketSource[], limit = 5): TicketSource[] {
  return sources
    .map((t, i) => ({ t, i, tier: tier(t) }))
    .filter((x) => x.tier < 3)
    .sort((a, b) => a.tier - b.tier || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.t);
}
