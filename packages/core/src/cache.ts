import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Cache su file JSON per rispettare i tier gratuiti delle fonti
 * (es. SerpApi 100 ricerche/mese). TTL configurabile, default 6h.
 * Fase 2: rimpiazzabile con Supabase/Redis dietro la stessa firma.
 */

// Su serverless (Vercel) il cwd e' read-only: usa /tmp (scrivibile, persiste
// per istanza calda). In locale usa ./.cache (ispezionabile). Override: CACHE_DIR.
const CACHE_DIR =
  process.env.CACHE_DIR ??
  (process.env.VERCEL ? join(tmpdir(), "eventi-cache") : join(process.cwd(), ".cache"));

function defaultTtl(): number {
  const env = process.env.CACHE_TTL_SECONDS;
  const n = env ? Number(env) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 21_600; // 6h
}

type Entry<T> = { ts: number; ttl: number; data: T };

function fileFor(key: string): string {
  const hash = createHash("sha1").update(key).digest("hex");
  return join(CACHE_DIR, `${hash}.json`);
}

async function read<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await readFile(fileFor(key), "utf8");
    const entry = JSON.parse(raw) as Entry<T>;
    const ageSec = (Date.now() - entry.ts) / 1000;
    if (ageSec > entry.ttl) return undefined; // scaduto
    return entry.data;
  } catch {
    return undefined; // miss o file assente
  }
}

async function write<T>(key: string, data: T, ttl: number): Promise<void> {
  // Best-effort: su filesystem read-only (es. serverless Vercel) la scrittura
  // fallisce; la cache e' un'ottimizzazione, non deve MAI far fallire la fonte.
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const entry: Entry<T> = { ts: Date.now(), ttl, data };
    await writeFile(fileFor(key), JSON.stringify(entry), "utf8");
  } catch {
    // ignora: niente cache su disco questa volta
  }
}

/**
 * Ritorna il valore in cache se fresco, altrimenti esegue `fn`, salva e ritorna.
 * `ttlSeconds` opzionale (default da env CACHE_TTL_SECONDS o 6h).
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds?: number,
): Promise<T> {
  const hit = await read<T>(key);
  if (hit !== undefined) return hit;
  const data = await fn();
  await write(key, data, ttlSeconds ?? defaultTtl());
  return data;
}
