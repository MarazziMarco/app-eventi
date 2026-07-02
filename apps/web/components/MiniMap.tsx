"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { geocodeVenue, type LatLng } from "@/lib/geocode-client";
import { heatColor } from "@/lib/heat";

/**
 * Mini-mappa nel dettaglio evento: mostra il luogo. Parte dalle coordinate note
 * (venue o centro città) e, se c'è un nome venue, prova a geocodarlo con
 * precisione (una richiesta Nominatim, cache). Non interattiva a fondo.
 */
export function MiniMap({
  lat,
  lng,
  venueName,
  city,
  hypeScore,
}: {
  lat: number;
  lng: number;
  venueName?: string;
  city?: string;
  hypeScore: number;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current, {
        attributionControl: false,
        zoomControl: false,
        dragging: true,
        scrollWheelZoom: false,
      }).setView([lat, lng], 13);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      const color = heatColor(hypeScore);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color},0 0 0 2px #0E0E13"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(map);

      // precisione: geocoding del venue (una volta, cache)
      if (venueName) {
        const ll: LatLng | null = await geocodeVenue(venueName, city);
        if (ll && !cancelled && map) {
          marker.setLatLng([ll.lat, ll.lng]);
          map.setView([ll.lat, ll.lng], 15);
        }
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, venueName, city, hypeScore]);

  return (
    <div
      ref={ref}
      className="h-40 w-full overflow-hidden rounded-xl border border-white/10"
      style={{ background: "#0E0E13" }}
    />
  );
}
