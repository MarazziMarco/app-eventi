"use client";

import type { Event } from "@eventi/core";
import { useCallback, useEffect, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { Hero } from "@/components/Hero";
import { FeedSkeleton } from "@/components/Skeleton";
import { eventsUrl } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geo";

type Meta = {
  rawCount: number;
  dedupedCount: number;
  finalCount: number;
  sources: string[];
  failed: string[];
  usedMock: boolean;
};
type ApiResponse = { meta: Meta; events: Event[] };

const PRESETS = {
  viterbo: { label: "Viterbo", lat: 42.4207, lng: 12.1077, city: "Viterbo" },
  roma: { label: "Roma", lat: 41.9028, lng: 12.4964, city: "Roma" },
} as const;

type Loc = { lat: number; lng: number; city?: string; label: string };

export default function Home(): React.ReactElement {
  const [loc, setLoc] = useState<Loc>({ ...PRESETS.roma });
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (l: Loc) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(eventsUrl({ lat: l.lat, lng: l.lng, ...(l.city ? { city: l.city } : {}) }));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as ApiResponse);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(loc);
  }, [loc, load]);

  const useMyLocation = async (): Promise<void> => {
    try {
      const { lat, lng } = await getCurrentPosition();
      setLoc({ lat, lng, label: "La mia posizione" });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const events = data?.events ?? [];
  const [hero, ...rest] = events;
  const dense = Boolean(data && data.meta.finalCount < data.meta.dedupedCount);
  const eyebrow = dense ? "Solo il meglio" : "Tutto quello che c'è in zona";

  const tabBtn = (active: boolean): string =>
    `rounded-full border px-4 py-2 text-sm transition-colors ${
      active
        ? "border-heat-75 bg-heat-75 text-ink"
        : "border-white/10 bg-surface text-text hover:bg-surface-2"
    }`;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-5">
      <header className="mb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Eventi migliori vicino a me
        </h1>
        <p className="mt-1 text-sm text-muted">
          L&apos;hype è una temperatura. Zone piene → solo il top, zone vuote → tutto.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap gap-2 bg-ink/90 px-4 py-3 backdrop-blur">
        <button
          className={tabBtn(loc.label === PRESETS.viterbo.label)}
          onClick={() => setLoc({ ...PRESETS.viterbo })}
        >
          Viterbo
        </button>
        <button
          className={tabBtn(loc.label === PRESETS.roma.label)}
          onClick={() => setLoc({ ...PRESETS.roma })}
        >
          Roma
        </button>
        <button
          className="rounded-full border border-white/10 bg-surface px-4 py-2 text-sm hover:bg-surface-2"
          onClick={() => void useMyLocation()}
        >
          Usa la mia posizione
        </button>
      </div>

      {data && (
        <p className="mb-4 mt-3 font-mono text-[11px] text-muted">
          {loc.label} · grezzi {data.meta.rawCount} → dedup {data.meta.dedupedCount} → mostrati{" "}
          {data.meta.finalCount} · {data.meta.sources.join(", ") || "—"}
          {data.meta.usedMock ? " · dati demo (nessuna chiave)" : ""}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-white/10 bg-surface p-4 text-sm text-muted">
          Qualcosa non ha risposto: {error}. Mostriamo quello che abbiamo.
        </div>
      )}

      {loading ? (
        <FeedSkeleton />
      ) : events.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Nessun evento in zona per ora.
        </p>
      ) : (
        <div className="space-y-6">
          {hero && <Hero event={hero} />}

          <section>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
              {eyebrow}
            </span>
            <div className="mt-3 space-y-3">
              {rest.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
