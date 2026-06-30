"use client";

import type { Event } from "@eventi/core";
import { useEffect } from "react";
import { categoryLabel, cleanCity, fmtDate, fmtTime, mapUrl } from "@/lib/format";
import { heatColorAlpha } from "@/lib/heat";
import { HeatReadout } from "./HeatReadout";

/**
 * Dettaglio evento in modal centrale animato. Mostra immagine, data/ora,
 * luogo (cliccabile -> mappa), descrizione (se c'e'), biglietti e info.
 */
export function EventModal({
  event,
  onClose,
}: {
  event: Event;
  onClose: () => void;
}): React.ReactElement {
  // chiudi con Esc + blocca lo scroll del body mentre il modal e' aperto
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const time = fmtTime(event.start);
  const place = [event.venue.name, cleanCity(event.city)].filter(Boolean).join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 motion-safe:animate-fade-in"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
    >
      <div
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-surface motion-safe:animate-modal-in"
        style={{
          boxShadow: `0 0 60px ${heatColorAlpha(event.hypeScore, 0.18)}`,
          paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-lg text-text backdrop-blur"
        >
          ✕
        </button>

        {event.image && (
          <img src={event.image} alt="" className="h-48 w-full object-cover" />
        )}

        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-xl font-bold leading-tight">{event.title}</h2>
            <HeatReadout score={event.hypeScore} size="lg" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-muted">
              {categoryLabel(event.category)}
            </span>
            {event.artist?.spotifyPopularity !== undefined && (
              <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[11px] text-muted">
                ♫ {event.artist.name} · {event.artist.spotifyPopularity}
              </span>
            )}
          </div>

          {/* data / ora */}
          <div className="space-y-1 font-mono text-sm">
            <div className="text-text">
              📅 {fmtDate(event.start)}
              {time ? ` · ${time}` : ""}
            </div>
            {place && (
              <a
                href={mapUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="block text-heat-75 hover:underline"
              >
                📍 {place} ↗
              </a>
            )}
          </div>

          {event.description && (
            <p className="text-sm leading-relaxed text-muted">{event.description}</p>
          )}

          {/* biglietti */}
          {event.ticketSources.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
                Biglietti & info
              </div>
              {event.ticketSources.map((t) => (
                <a
                  key={t.url}
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm font-medium hover:border-heat-75"
                >
                  <span>{t.name}</span>
                  <span className="text-heat-75">
                    {t.price !== undefined ? `da ${t.price}€ ↗` : "Apri ↗"}
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* link info generico */}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-muted hover:text-text"
            >
              Maggiori informazioni ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
