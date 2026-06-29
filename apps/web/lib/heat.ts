/**
 * "Heat": l'hypeScore (0-100) e' una temperatura. heatColor interpola la rampa
 * indaco -> viola -> rosa -> ambra. E' la firma visiva dell'app: usata per
 * readout, bordi/glow delle card e accenti, NON un colore d'accento fisso.
 */

type Rgb = [number, number, number];

// stop della rampa (devono combaciare con i token --heat-* in globals.css)
const STOPS: { at: number; rgb: Rgb }[] = [
  { at: 0, rgb: [0x5b, 0x6c, 0xff] }, // --heat-0  indaco
  { at: 50, rgb: [0xb1, 0x4c, 0xff] }, // --heat-50 viola
  { at: 75, rgb: [0xff, 0x3d, 0x7f] }, // --heat-75 rosa
  { at: 100, rgb: [0xff, 0x8a, 0x3d] }, // --heat-100 ambra
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Colore della rampa Heat per uno score 0-100, come stringa rgb(). */
export function heatColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i]!;
    const hi = STOPS[i + 1]!;
    if (s <= hi.at) {
      const t = (s - lo.at) / (hi.at - lo.at);
      const [r, g, b] = [0, 1, 2].map((k) => lerp(lo.rgb[k]!, hi.rgb[k]!, t)) as unknown as Rgb;
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = STOPS[STOPS.length - 1]!.rgb;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

/** Versione con alpha (per glow/sfondi). */
export function heatColorAlpha(score: number, alpha: number): string {
  return heatColor(score).replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
}

/** Etichetta breve della temperatura, per accessibilita'/copy. */
export function heatLabel(score: number): string {
  if (score >= 80) return "rovente";
  if (score >= 60) return "caldo";
  if (score >= 40) return "tiepido";
  return "freddo";
}
