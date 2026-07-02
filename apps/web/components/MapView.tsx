"use client";

import "leaflet/dist/leaflet.css";
import type { Event } from "@eventi/core";
import { useEffect, useRef } from "react";
import { fmtDate } from "@/lib/format";
import { heatColor } from "@/lib/heat";

/**
 * Mappa degli eventi (Leaflet + tiles CartoDB dark, free/no-key). Ogni evento
 * ha coordinate (venue reale o centro città dal server). Pin colorato per hype;
 * zoomando abbastanza compaiono le etichette (nome breve + data); click sul pin
 * apre la scheda evento.
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

      map = L.map(ref.current, { attributionControl: true }).setView(
        [center.lat, center.lng],
        10,
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      const markers: import("leaflet").Marker[] = [];
      const pts: [number, number][] = [];

      for (const e of events) {
        const { lat, lng } = e.venue;
        if (lat === undefined || lng === undefined) continue;
        const color = heatColor(e.hypeScore);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color},0 0 0 2px #0E0E13"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const m = L.marker([lat, lng], { icon }).addTo(map);
        const short = e.title.length > 26 ? `${e.title.slice(0, 24)}…` : e.title;
        m.bindTooltip(`${short}<br><span style="opacity:.65">${fmtDate(e.start)}</span>`, {
          direction: "top",
          permanent: true,
          className: "ev-tip",
          offset: [0, -8],
        });
        m.on("click", () => onOpenRef.current(e));
        markers.push(m);
        pts.push([lat, lng]);
      }

      if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 });

      // etichette solo con zoom sufficiente (altrimenti si accavallano)
      const updateLabels = (): void => {
        if (!map) return;
        const z = map.getZoom();
        for (const m of markers) {
          if (z >= 12) m.openTooltip();
          else m.closeTooltip();
        }
      };
      updateLabels();
      map.on("zoomend", updateLabels);
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
