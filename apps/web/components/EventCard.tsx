import type { Event } from "@eventi/core";
import { categoryLabel, cleanCity, fmtDate } from "@/lib/format";
import { heatColorAlpha } from "@/lib/heat";
import { HeatReadout } from "./HeatReadout";

/** Card del feed: immagine eroe, titolo display, venue/data mono, heat readout. */
export function EventCard({ event, index }: { event: Event; index: number }): React.ReactElement {
  const glow = heatColorAlpha(event.hypeScore, 0.5);
  return (
    <article
      className="group flex gap-3 overflow-hidden rounded-2xl border border-white/5 bg-surface transition-colors hover:bg-surface-2 motion-safe:animate-rise"
      style={{
        borderLeft: `3px solid ${glow}`,
        animationDelay: `${Math.min(index, 10) * 45}ms`,
      }}
    >
      <div className="relative h-28 w-28 shrink-0 overflow-hidden bg-surface-2 sm:h-32 sm:w-32">
        {event.image ? (
          <img
            src={event.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${glow}, transparent)` }}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 py-3 pr-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold leading-tight">{event.title}</h3>
          <HeatReadout score={event.hypeScore} />
        </div>
        <p className="font-mono text-xs text-muted">
          {[event.venue.name, cleanCity(event.city)].filter(Boolean).join(" · ") || "Luogo n/d"}
        </p>
        <p className="font-mono text-[11px] text-muted/70">{fmtDate(event.start)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-muted">
            {categoryLabel(event.category)}
          </span>
          {event.artist?.spotifyPopularity !== undefined && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[11px] text-muted">
              ♫ {event.artist.spotifyPopularity}
            </span>
          )}
        </div>
        {event.ticketSources[0] && (
          <a
            className="mt-auto w-fit pt-1 text-sm font-medium text-heat-75 hover:underline"
            href={event.ticketSources[0].url}
            target="_blank"
            rel="noreferrer"
          >
            Biglietti → {event.ticketSources[0].name}
          </a>
        )}
      </div>
    </article>
  );
}
