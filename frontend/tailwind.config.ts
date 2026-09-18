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
        background: "#030014",
        foreground: "#f8fafc",
        primary: "#7c3aed",
        "primary-hover": "#6d28d9",
        secondary: "#06b6d4",
        accent: "#f43f5e",
        card: "rgba(15, 23, 42, 0.6)",
        "card-border": "rgba(124, 58, 237, 0.15)",
        "glass-border": "rgba(255, 255, 255, 0.08)",
      },
      animation: {
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",
        "float-slow": "float 8s ease-in-out 1s infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "grid-fade": "grid-fade 4s ease-in-out infinite alternate",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(124, 58, 237, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(124, 58, 237, 0.7), 0 0 60px rgba(124, 58, 237, 0.3)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-12px) rotate(1deg)" },
          "66%": { transform: "translateY(6px) rotate(-1deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "grid-fade": {
          "0%": { opacity: "0.3" },
          "100%": { opacity: "0.6" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "shimmer-gradient": "linear-gradient(110deg, transparent 25%, rgba(124, 58, 237, 0.1) 37%, transparent 63%)",
      },
    },
  },
  plugins: [],
};
export default config;
