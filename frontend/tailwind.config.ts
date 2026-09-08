import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark blue accent (#1e40af)
        primary: {
          50: "#eef2fb", 100: "#dae2f6", 200: "#b4c5ec", 300: "#839ddd",
          400: "#4f6fc8", 500: "#1e40af", 600: "#1a389a", 700: "#163083",
          800: "#132866", 900: "#10204d",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { "2xl": "1rem", "3xl": "1.5rem" },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(124,92,255,0.18)",
        card: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
