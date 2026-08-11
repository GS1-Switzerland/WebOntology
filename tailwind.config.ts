import type { Config } from "tailwindcss";

// Design language: "signal registry" — evokes a rail signal box / standards
// ledger rather than a generic SaaS marketing template. Ink-slate surfaces,
// a single signal-amber accent used sparingly for state (current / staging /
// deprecated), and a mono face for every URI, term id and code value so
// identifiers always read as data, not prose.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0F14",
          900: "#12181F",
          800: "#1B232C",
          700: "#26313C",
          600: "#37444F",
          500: "#4C5B67",
          400: "#71818C",
          300: "#9DABB4",
          200: "#C7D1D7",
          100: "#E6EBEE",
          50: "#F5F7F8",
        },
        signal: {
          DEFAULT: "#C97A2B",
          light: "#E0975A",
          dim: "#8A5620",
        },
        ledger: {
          teal: "#2C7A73",
          moss: "#6B7A3A",
          rust: "#A64B3C",
        },
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "\"IBM Plex Sans\"", "system-ui", "sans-serif"],
        body: ["\"IBM Plex Sans\"", "system-ui", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(11,15,20,0.04), 0 1px 3px rgba(11,15,20,0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
