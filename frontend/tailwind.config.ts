import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#00F0FF",
          hover: "#00C2FF",
          glow: "rgba(0, 240, 255, 0.4)",
        },
        secondary: {
          DEFAULT: "#7000FF",
          hover: "#5900CC",
          glow: "rgba(112, 0, 255, 0.4)",
        },
        accent: {
          DEFAULT: "#FF0055",
          hover: "#D60047",
        },
        dark: {
          bg: "#07090E",
          card: "rgba(15, 23, 42, 0.6)",
          cardHover: "rgba(30, 41, 59, 0.8)",
          border: "rgba(255, 255, 255, 0.08)",
          borderGlow: "rgba(0, 240, 255, 0.3)",
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "cyber-grid": "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(0, 240, 255, 0.2)" },
          "100%": { boxShadow: "0 0 30px rgba(0, 240, 255, 0.6)" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
