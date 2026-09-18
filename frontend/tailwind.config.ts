import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#ffffff",
        primary: "#00ffff", // Neon Cyan
        "primary-hover": "#00e5ff",
        secondary: "#ff003c", // Cyberpunk Red/Pink for destructive actions
        accent: "#00ffff",
        card: "rgba(0, 0, 0, 0.7)",
        "card-border": "rgba(0, 255, 255, 0.3)",
        "glass-border": "rgba(0, 255, 255, 0.2)",
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)',
        'neon-strong': '0 0 15px rgba(0, 255, 255, 0.8), 0 0 30px rgba(0, 255, 255, 0.5)',
      },
      animation: {
        "glow": "glow 2s ease-in-out infinite alternate",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "glitch": "glitch 1s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 255, 255, 0.7), 0 0 40px rgba(0, 255, 255, 0.4)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      fontFamily: {
        mono: ['"Fira Code"', 'monospace'], // Suggesting a techy font fallback
      }
    },
  },
  plugins: [],
};
export default config;
