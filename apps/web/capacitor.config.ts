import type { CapacitorConfig } from "@capacitor/cli";

// Modalita' LIVE: se CAP_SERVER_URL e' settato al `cap sync`, l'app carica quel
// sito remoto (es. il deploy Vercel) e si aggiorna a ogni deploy senza rebuild.
// Senza il flag, l'app usa il bundle statico in ./out (offline, "vera" build).
const liveUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.marazzi.eventi",
  appName: "Eventi",
  webDir: "out",
  ...(liveUrl ? { server: { url: liveUrl, cleartext: false } } : {}),
};

export default config;
