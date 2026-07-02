/**
 * Cache lato client (localStorage) per non rifare la ricerca a ogni riapertura
 * dell'app / cambio scheda. Persiste nel webview Capacitor e nella PWA.
 * Chiave = query (posizione+raggio+finestra); TTL configurabile.
 */

const PREFIX = "eventi:v1:";

export function getCached<T>(key: string, ttlMs: number): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts > ttlMs) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

export function setCached<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota localStorage piena o non disponibile: ignora */
  }
}
