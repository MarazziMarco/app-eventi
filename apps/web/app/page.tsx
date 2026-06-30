"use client";

import type { Event } from "@eventi/core";
import { useCallback, useEffect, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { EventModal } from "@/components/EventModal";
import { Hero } from "@/components/Hero";
import { Logo } from "@/components/Logo";
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
  const [selected, setSelected] = useState<Event | null>(null);
  const [radiusKm, setRadiusKm] = useState(30);

  const load = useCallback(
    async (l: Loc) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          eventsUrl({ lat: l.lat, lng: l.lng, radiusKm, ...(l.city ? { city: l.city } : {}) }),
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData((await res.json()) as ApiResponse);
      } catch (e) {
        setError((e as Error).message);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [radiusKm],
  );

  useEffect(() => {
    void load(loc);
  }, [loc, load]);

  // all'apertura: chiedi e usa la posizione reale; se negata resta sul preset.
  useEffect(() => {
    void (async () => {
      try {
        const { lat, lng } = await getCurrentPosition();
        setLoc({ lat, lng, label: "La mia posizione" });
      } catch {
        /* permesso negato o non disponibile: resta sul default */
      }
    })();
  }, []);

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
    <main
      className="mx-auto max-w-3xl"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
    >
      {/* app bar: riempie sotto la Dynamic Island, contenuto spinto giu' */}
      <header
        className="sticky top-0 z-20 border-b border-white/5 bg-ink/95 px-4 pb-3 backdrop-blur-md"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <span className="font-display text-lg font-bold tracking-tight">Eventi</span>
          <span className="ml-auto font-mono text-[11px] text-muted">{loc.label}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
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

        {loc.label === "La mia posizione" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted/70">
              raggio
            </span>
            {[30, 50, 100].map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                  radiusKm === r
                    ? "border-heat-75 text-heat-75"
                    : "border-white/10 text-muted hover:text-text"
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="px-4 pt-4">
        {error && (
          <div className="mb-4 rounded-xl border border-white/10 bg-surface p-4 text-sm text-muted">
            Qualcosa non ha risposto: {error}. Mostriamo quello che abbiamo.
          </div>
        )}

        {loading ? (
          <FeedSkeleton />
        ) : events.length === 0 ? (
          <p className="py-16 text-center text-muted">Nessun evento in zona per ora.</p>
        ) : (
          <div className="space-y-6">
            {hero && <Hero event={hero} onOpen={setSelected} />}

            <section>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {eyebrow}
                </span>
                <span className="font-mono text-[10px] text-muted/60">
                  {data?.meta.finalCount ?? 0} eventi
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {rest.map((e, i) => (
                  <EventCard key={e.id} event={e} index={i} onOpen={setSelected} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
