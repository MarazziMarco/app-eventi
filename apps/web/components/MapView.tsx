"use client";

import "leaflet/dist/leaflet.css";
import type { Event } from "@eventi/core";
import { useEffect, useRef } from "react";
import { geocodeVenue } from "@/lib/geocode-client";
import { heatColor } from "@/lib/heat";

/**
 * Mappa degli eventi (Leaflet + tiles CartoDB dark, free/no-key). Gli eventi con
 * coordinate compaiono subito; gli altri vengono geocodati lazy via Nominatim
 * (cache in localStorage). Pin colorato per hype; click -> apre il dettaglio.
 */
export function MapView({
  events,
  center,
  onOpen,
}: {
  events: Event[];
  center: { lat: number; lng: number };
  onOpen: (e: Event) => void;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current, { attributionControl: true }).setView([center.lat, center.lng], 9);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      const addPin = (ev: Event, lat: number, lng: number): void => {
        if (cancelled || !map) return;
        const color = heatColor(ev.hypeScore);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color},0 0 0 2px #0E0E13"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const m = L.marker([lat, lng], { icon }).addTo(map);
        m.bindTooltip(`${ev.hypeScore} · ${ev.title}`, { direction: "top" });
        m.on("click", () => onOpenRef.current(ev));
      };

      // 1) eventi con coordinate: subito
      for (const e of events) {
        if (e.venue.lat !== undefined && e.venue.lng !== undefined) {
          addPin(e, e.venue.lat, e.venue.lng);
        }
      }
      // 2) eventi senza coordinate: geocoding lazy (sequenziale, cache)
      for (const e of events) {
        if (cancelled) break;
        if (e.venue.lat !== undefined && e.venue.lng !== undefined) continue;
        const name = e.venue.name ?? e.city;
        if (!name) continue;
        const ll = await geocodeVenue(name, e.city);
        if (ll) addPin(e, ll.lat, ll.lng);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [events, center.lat, center.lng]);

  return (
    <div
      ref={ref}
      className="h-[70vh] w-full overflow-hidden rounded-2xl border border-white/10"
      style={{ background: "#0E0E13" }}
    />
  );
}
