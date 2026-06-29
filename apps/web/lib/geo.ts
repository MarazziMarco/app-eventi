/**
 * Posizione: nativa via Capacitor Geolocation nell'app, navigator.geolocation
 * sul web. La scelta e' isolata in chooseGeoProvider per essere testabile.
 */
export type GeoProvider = "capacitor" | "web";

export function chooseGeoProvider(isNative: boolean): GeoProvider {
  return isNative ? "capacitor" : "web";
}

export type Coords = { lat: number; lng: number };

/** Ottiene la posizione corrente usando il provider giusto per la piattaforma. */
export async function getCurrentPosition(): Promise<Coords> {
  const { Capacitor } = await import("@capacitor/core");
  const provider = chooseGeoProvider(Capacitor.isNativePlatform());

  if (provider === "capacitor") {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition();
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  return new Promise<Coords>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non disponibile"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.message)),
    );
  });
}
