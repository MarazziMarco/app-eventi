/**
 * Tabella venue noti (capacityTier) + allowlist di locali famosi.
 *
 * capacityTier: 3 = stadio/arena, 2 = grande club/teatro grande,
 *               1 = medio, 0 = piccolo.
 *
 * I venue in FAMOUS_VENUES passano SEMPRE il filtro adattivo, anche se
 * il loro hypeScore e' sotto il cutoff (es. serata a un locale iconico).
 */

export type VenueInfo = {
  /** chiave normalizzata (lowercase, no accenti) */
  key: string;
  capacityTier: 0 | 1 | 2 | 3;
  city?: string;
  /** se true e' nella allowlist "famosi" */
  famous?: boolean;
};

/** Normalizza un nome venue per il match (lowercase, no accenti, trim). */
export function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const KNOWN_VENUES: VenueInfo[] = [
  // Stadi / arene (tier 3)
  { key: "stadio olimpico", capacityTier: 3, city: "Roma", famous: true },
  { key: "olimpico grande torino", capacityTier: 3, city: "Torino" },
  { key: "stadio san siro", capacityTier: 3, city: "Milano", famous: true },
  { key: "stadio giuseppe meazza", capacityTier: 3, city: "Milano", famous: true },
  { key: "stadio diego armando maradona", capacityTier: 3, city: "Napoli" },
  { key: "stadio artemio franchi", capacityTier: 3, city: "Firenze" },
  { key: "unipol arena", capacityTier: 3, city: "Bologna" },
  { key: "mediolanum forum", capacityTier: 3, city: "Milano", famous: true },
  { key: "palazzo dello sport", capacityTier: 3, city: "Roma" },
  { key: "foro italico", capacityTier: 3, city: "Roma", famous: true }, // Internazionali BNL
  { key: "rcf arena", capacityTier: 3, city: "Reggio Emilia" }, // Campovolo
  { key: "ippodromo snai la maura", capacityTier: 3, city: "Milano" },
  { key: "circo massimo", capacityTier: 3, city: "Roma", famous: true },
  { key: "arena di verona", capacityTier: 3, city: "Verona", famous: true },

  // Grandi club / teatri grandi (tier 2)
  { key: "fabrique", capacityTier: 2, city: "Milano", famous: true },
  { key: "alcatraz", capacityTier: 2, city: "Milano", famous: true },
  { key: "atlantico", capacityTier: 2, city: "Roma" },
  { key: "largo venue", capacityTier: 1, city: "Roma" },
  { key: "auditorium parco della musica", capacityTier: 2, city: "Roma", famous: true },

  // Nightlife iconica (allowlist, capacita' variabile)
  { key: "cocorico", capacityTier: 2, city: "Riccione", famous: true },
  { key: "peter pan", capacityTier: 1, city: "Riccione", famous: true },
  { key: "praja", capacityTier: 2, city: "Gallipoli", famous: true },
  { key: "goa club", capacityTier: 1, city: "Roma", famous: true },

  // Viterbo (zona bassa densita', tier bassi: serve a testare lo "show all")
  { key: "teatro dell unione", capacityTier: 1, city: "Viterbo" },
  { key: "tuscia in jazz", capacityTier: 1, city: "Viterbo" },
];

const BY_KEY = new Map(KNOWN_VENUES.map((v) => [v.key, v]));

/** Cerca un venue noto per nome (match esatto sul nome normalizzato). */
export function lookupVenue(name: string | undefined): VenueInfo | undefined {
  if (!name) return undefined;
  return BY_KEY.get(normalizeVenueName(name));
}

/** Allowlist dei venue famosi (chiavi normalizzate). */
export const FAMOUS_VENUES: Set<string> = new Set(
  KNOWN_VENUES.filter((v) => v.famous).map((v) => v.key),
);

/** true se il venue e' nella allowlist famosi. */
export function isFamousVenue(name: string | undefined): boolean {
  if (!name) return false;
  return FAMOUS_VENUES.has(normalizeVenueName(name));
}

/**
 * Deduce capacityTier da keyword nel nome quando il venue e' sconosciuto.
 * Euristica volutamente semplice e tunabile.
 */
export function guessCapacityTier(name: string | undefined): 0 | 1 | 2 | 3 {
  if (!name) return 0;
  const n = normalizeVenueName(name);
  if (/(stadio|arena|forum|ippodromo|foro italico|campovolo|circo massimo)/.test(n)) return 3;
  if (/(palazzetto|palasport|fabrique|alcatraz|auditorium|fiera|expo)/.test(n)) return 2;
  if (/(teatro|club|hall|live|factory|discoteca)/.test(n)) return 1;
  return 0;
}

/** Risolve il capacityTier: prima i venue noti, poi euristica sul nome. */
export function resolveCapacityTier(name: string | undefined): 0 | 1 | 2 | 3 {
  return lookupVenue(name)?.capacityTier ?? guessCapacityTier(name);
}
