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
        // SHIVAM Chatbot Design System
        space: {
          950: "#03050a",
          900: "#060c16",
          800: "#0a1628",
          700: "#0f2040",
          600: "#162d59",
        },
        cyan: {
          50:  "#edfffe",
          100: "#c5fffd",
          200: "#8bfffe",
          300: "#40fffe",
          400: "#00f5f0",
          500: "#00d4cf",
          600: "#00a8a4",
          700: "#008380",
          800: "#006764",
          900: "#065351",
        },
        nebula: {
          purple: "#7c3aed",
          pink:   "#db2777",
          blue:   "#2563eb",
        },
        glass: {
          white: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.08)",
          hover: "rgba(255,255,255,0.10)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "galaxy":
          "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,212,207,0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(37,99,235,0.10) 0%, transparent 50%)",
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        "cyan-glow":
          "radial-gradient(ellipse at center, rgba(0,212,207,0.3) 0%, transparent 70%)",
      },
      boxShadow: {
        glass: "0 4px 24px -1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-lg": "0 8px 40px -4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        "cyan-glow": "0 0 24px rgba(0,212,207,0.4), 0 0 48px rgba(0,212,207,0.15)",
        "purple-glow": "0 0 24px rgba(124,58,237,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0,212,207,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(0,212,207,0.6)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
