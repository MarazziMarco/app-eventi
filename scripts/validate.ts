/**
 * CLI di validazione copertura + ranking.
 *   pnpm validate
 *
 * Stampa fianco a fianco i risultati per Viterbo (bassa densita') e Roma
 * (alta densita'). Verifica a colpo d'occhio che a Viterbo esca "tutto" e a
 * Roma solo il top.
 *
 * Carica .env se presente (chiavi opzionali: senza chiavi alcune fonti sono
 * semplicemente disattivate, lo script gira comunque).
 */
import { runPipeline, type PipelineResult } from "@eventi/sources";
import { itSourceMode } from "@eventi/sources";

// carica .env se presente (Node >=20.12). Chiavi tutte opzionali.
try {
  process.loadEnvFile(".env");
} catch {
  /* nessun .env: si gira con le fonti senza chiave */
}

type Preset = { name: string; lat: number; lng: number; cityLabel: string };

const PRESETS: Preset[] = [
  { name: "Viterbo (sparse)", lat: 42.4207, lng: 12.1077, cityLabel: "Viterbo" },
  { name: "Roma (dense)", lat: 41.9028, lng: 12.4964, cityLabel: "Roma" },
];

function defaultWindow(): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + 60);
  return { from: iso(now), to: iso(to) };
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

function printResult(preset: Preset, r: PipelineResult): void {
  const line = "─".repeat(64);
  console.log(`\n${line}`);
  console.log(`📍 ${preset.name}  [${preset.lat}, ${preset.lng}]`);
  console.log(line);
  console.log(`fonti attive : ${r.sources.join(", ") || "(nessuna configurata)"}${r.usedMock ? "  ⚠ fixture mock (nessuna chiave)" : ""}`);
  if (r.failed.length) console.log(`fonti fallite: ${r.failed.join(", ")}`);
  console.log(`candidati grezzi : ${r.rawCount}`);
  console.log(`dopo dedup       : ${r.dedupedCount}`);
  console.log(`dopo filtro      : ${r.events.length}`);
  console.log("");
  if (r.events.length === 0) {
    console.log("  (nessun evento — configura almeno una fonte in .env)");
    return;
  }
  for (const e of r.events) {
    const venue = e.venue.name ?? e.city ?? "?";
    const day = e.start.slice(0, 10);
    console.log(
      `  [${String(e.hypeScore).padStart(3)}] ${e.title}  ·  ${venue}  ·  ${day}  ·  ${e.category}  ·  {${e.sources.join("+")}}`,
    );
  }
}

async function main(): Promise<void> {
  const { from, to } = defaultWindow();
  console.log(`Finestra: ${from} → ${to}  |  raggio 30km  |  fonte IT: ${itSourceMode()}`);

  for (const p of PRESETS) {
    const r = await runPipeline({
      lat: p.lat,
      lng: p.lng,
      radiusKm: 30,
      from,
      to,
      country: "it",
      lang: "it",
      cityLabel: p.cityLabel,
    });
    printResult(p, r);
  }

  console.log(
    "\n✔ Atteso: Viterbo mostra (quasi) tutti i candidati; Roma taglia ai soli alti + venue famosi.\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
