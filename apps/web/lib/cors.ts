/**
 * Header CORS per /api/events. L'app Capacitor chiama da origin
 * `capacitor://localhost` (iOS) / `http://localhost` (android): consentiamo *.
 * La route e' di sola lettura (GET) e non usa cookie, quindi `*` e' sicuro.
 */
export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
