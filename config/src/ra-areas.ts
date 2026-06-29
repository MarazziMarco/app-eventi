/**
 * Resident Advisor filtra gli eventi per "area" numerica, non per lat/lng.
 * Qui mappiamo le città che supportiamo sul loro RA areaId.
 *
 * NB: gli areaId vanno confermati contro ra.co in fase di test live (aprire
 * https://ra.co/events/it/<citta> e leggere l'area nelle richieste GraphQL).
 * I valori sotto sono il punto di partenza; correggili se la query torna vuota.
 */

export const RA_AREAS: Record<string, number> = {
  roma: 20,
  milano: 13,
  bologna: 18,
  napoli: 24,
  torino: 23,
  firenze: 19,
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
