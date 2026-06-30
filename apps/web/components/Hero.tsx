import type { Event } from "@eventi/core";
import { categoryLabel, cleanCity, fmtDate } from "@/lib/format";
import { heatColorAlpha } from "@/lib/heat";
import { HeatReadout } from "./HeatReadout";

/** Evento piu' caldo: full-bleed image + scrim, titolo display, heat che pulsa. */
export function Hero({ event }: { event: Event }): React.ReactElement {
  const glow = heatColorAlpha(event.hypeScore, 0.45);
  return (
    <a
      href={event.ticketSources[0]?.url ?? event.url}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-3xl border border-white/5"
      style={{ boxShadow: `0 0 60px ${heatColorAlpha(event.hypeScore, 0.18)}` }}
    >
      <div className="relative aspect-[16/10] w-full bg-surface-2 sm:aspect-[16/8]">
        {event.image ? (
          <img
            src={event.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `radial-gradient(120% 120% at 0% 0%, ${glow}, transparent)` }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(14,14,19,0.96) 12%, rgba(14,14,19,0.35) 55%, transparent)",
          }}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
        <div className="min-w-0">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {categoryLabel(event.category)} · l&apos;evento piu&apos; caldo
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-4xl">
            {event.title}
          </h2>
          <p className="mt-1 font-mono text-xs text-muted sm:text-sm">
            {[event.venue.name, cleanCity(event.city)].filter(Boolean).join(" · ")} · {fmtDate(event.start)}
          </p>
        </div>
        <HeatReadout score={event.hypeScore} size="lg" pulse />
      </div>
    </a>
  );
}
