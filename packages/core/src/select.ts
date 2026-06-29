import type { Event, SelectionConfig } from "./types";

export type SelectOptions = SelectionConfig & {
  /** predicate allowlist: true se il venue passa SEMPRE il filtro */
  isFamous?: (venueName: string | undefined) => boolean;
};

const byHypeDesc = (a: Event, b: Event): number => b.hypeScore - a.hypeScore;

/**
 * Filtro adattivo alla densita'.
 *
 *  - N <= SHOW_ALL_THRESHOLD            -> mostra TUTTO (zona bassa densita').
 *  - altrimenti:
 *      aboveMin = eventi con hype >= MIN_HYPE
 *      byPercent = top max(SHOW_ALL_THRESHOLD, ceil(N * TOP_PERCENT))
 *      se aboveMin >= SHOW_ALL_THRESHOLD usa aboveMin (cutoff "qualitativo"),
 *      altrimenti usa byPercent (cutoff "relativo"): cosi' non resti mai
 *      con troppo poco se in zona la qualita' media e' bassa.
 *  - i venue in allowlist (isFamous) passano SEMPRE, anche sotto cutoff.
 *
 * Output sempre ordinato per hypeScore desc.
 */
export function selectEvents(events: Event[], opts: SelectOptions): Event[] {
  const sorted = [...events].sort(byHypeDesc);
  const n = sorted.length;

  if (n <= opts.showAllThreshold) return sorted;

  const aboveMin = sorted.filter((e) => e.hypeScore >= opts.minHype);
  const percentCount = Math.max(opts.showAllThreshold, Math.ceil(n * opts.topPercent));
  const byPercent = sorted.slice(0, percentCount);

  const base = aboveMin.length >= opts.showAllThreshold ? aboveMin : byPercent;

  // allowlist: aggiungi i famosi non gia' inclusi
  const chosen = new Map(base.map((e) => [e.id, e]));
  if (opts.isFamous) {
    for (const e of sorted) {
      if (!chosen.has(e.id) && opts.isFamous(e.venue.name)) chosen.set(e.id, e);
    }
  }

  return [...chosen.values()].sort(byHypeDesc);
}
