/**
 * Fetch JSON con timeout, retry e back-off esponenziale.
 * Tutti gli adapter HTTP passano da qui per avere rate-limit friendly behavior.
 */

export type FetchOptions = {
  timeoutMs?: number;
  retries?: number;
  /** header extra */
  headers?: Record<string, string>;
};

const DEFAULTS = { timeoutMs: 10_000, retries: 2 };

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const { timeoutMs, retries } = { ...DEFAULTS, ...opts };
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: opts.headers });
      if (res.status === 429 || res.status >= 500) {
        throw new HttpError(res.status, `HTTP ${res.status} su ${safeUrl(url)}`);
      }
      if (!res.ok) {
        throw new HttpError(res.status, `HTTP ${res.status} su ${safeUrl(url)}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      // non ritentare su 4xx diversi da 429
      if (err instanceof HttpError && err.status < 500 && err.status !== 429) break;
      if (attempt < retries) await sleep(backoffMs(attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function backoffMs(attempt: number): number {
  return Math.min(2000, 250 * 2 ** attempt) + Math.random() * 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** rimuove eventuali api_key dal log degli URL */
function safeUrl(url: string): string {
  return url.replace(/(api_key|apikey)=[^&]+/gi, "$1=***");
}
