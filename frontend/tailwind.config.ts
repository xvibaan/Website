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
        background: "#05050A", // Deep charcoal/midnight blue
        foreground: "#F8F9FA", // High-contrast off-white
        primary: "#00C2FF", // Softer Cyan
        "primary-hover": "#00E5FF",
        secondary: "#7B61FF", // Deep Violet for contrast
        destructive: "#FF4D4D", // Soft Red
        accent: "#00C2FF",
        card: "rgba(255, 255, 255, 0.03)",
        "card-border": "rgba(255, 255, 255, 0.1)",
        "glass-border": "rgba(255, 255, 255, 0.05)",
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 194, 255, 0.3), 0 0 20px rgba(0, 194, 255, 0.1)',
        'neon-strong': '0 0 15px rgba(0, 194, 255, 0.5), 0 0 30px rgba(0, 194, 255, 0.3)',
      },
      animation: {
        "glow": "glow 2s ease-in-out infinite alternate",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "glitch": "glitch 1s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 10px rgba(0, 194, 255, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 194, 255, 0.4), 0 0 40px rgba(0, 194, 255, 0.2)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      }
    },
  },
  plugins: [],
};
export default config;
