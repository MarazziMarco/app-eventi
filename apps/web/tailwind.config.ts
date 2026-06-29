import type { Config } from "tailwindcss";

/**
 * Design system "Heat": l'hype e' una temperatura. I token vivono come CSS
 * variables in globals.css; qui li mappiamo su utility Tailwind.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        text: "var(--text)",
        muted: "var(--text-muted)",
        "heat-0": "var(--heat-0)",
        "heat-50": "var(--heat-50)",
        "heat-75": "var(--heat-75)",
        "heat-100": "var(--heat-100)",
      },
      fontFamily: {
        display: ["'Clash Display'", "system-ui", "sans-serif"],
        sans: ["'Satoshi'", "system-ui", "sans-serif"],
        mono: ["'Space Mono'", "ui-monospace", "monospace"],
      },
      keyframes: {
        "heat-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        "rise": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "heat-pulse": "heat-pulse 2.4s ease-in-out infinite",
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
