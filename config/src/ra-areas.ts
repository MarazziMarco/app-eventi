/**
 * Resident Advisor filtra gli eventi per "area" numerica, non per lat/lng.
 * Qui mappiamo le città che supportiamo sul loro RA areaId.
 *
 * areaId verificati live contro ra.co/graphql (2026-06-29) sondando gli id e
 * leggendo il nome area restituito. Se RA rinumera, riconferma con uno script
 * che interroga eventListings per id e stampa venue.area.name.
 */

export const RA_AREAS: Record<string, number> = {
  roma: 52,
  milano: 171,
  napoli: 406,
  torino: 348,
  bologna: 350,
  firenze: 352,
};

function normalizeCity(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** areaId RA per una città, o undefined se non supportata. */
export function raAreaForCity(cityLabel: string | undefined): number | undefined {
  if (!cityLabel) return undefined;
  return RA_AREAS[normalizeCity(cityLabel)];
}
