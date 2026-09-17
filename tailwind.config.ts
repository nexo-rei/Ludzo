import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gaming: {
  background: "hsl(var(--gaming-background))",
  foreground: "hsl(var(--gaming-foreground))",
  surface: "hsl(var(--gaming-surface))",
  muted: "hsl(var(--gaming-muted))",
  border: "hsl(var(--gaming-border))",
  primary: "hsl(var(--gaming-primary))",
  accent: "hsl(var(--gaming-accent))",
  gold: "hsl(var(--gaming-gold))",
  success: "hsl(var(--gaming-success))",
  error: "hsl(var(--gaming-error))",
},
        purple: {
          50: "#EFFAF5", 100: "#DCF3E7", 200: "#B7E7D0", 300: "#8AD6B3",
          400: "#5BBF95", 500: "#359C76", 600: "#23856C", 700: "#196A55",
          800: "#195344", 900: "#173E33", 950: "#102B24",
          primary: "#23856C",
          dark: "#196A55",
          light: "#63D9B4",
        },
        blue: {
          primary: "#3B82F6",
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        gold: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
          light: "#FCD34D",
        },
        dark: {
          DEFAULT: "#0F172A",
          elevated: "#1E293B",
          card: "#1A2540",
        },
        light: {
          DEFAULT: "#F8FAFC",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 1.8s infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 3s ease-in-out infinite",
        "flame": "flame-flicker 0.8s ease-in-out infinite",
        "spin-slow": "spin 4s linear infinite",
        "count-up": "count-up 0.4s ease-out forwards",
        "page-in": "page-in 0.2s ease-out forwards",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        glow: {
          "0%": { boxShadow: "0 0 8px rgba(35,133,108,0.3)" },
          "100%": { boxShadow: "0 0 28px rgba(35,133,108,0.65)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "flame-flicker": {
          "0%, 100%": { transform: "scaleX(1) scaleY(1)" },
          "33%": { transform: "scaleX(0.96) scaleY(1.04)" },
          "66%": { transform: "scaleX(1.04) scaleY(0.97)" },
        },
        "count-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "page-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      maxWidth: {
        app: "480px",
      },
      backdropBlur: {
        xs: "2px",
        xl: "24px",
      },
      boxShadow: {
        "purple-sm": "0 4px 16px rgba(35,133,108,0.25)",
        "purple-md": "0 8px 32px rgba(35,133,108,0.3)",
        "gold-sm": "0 4px 16px rgba(245,158,11,0.2)",
        "success-sm": "0 4px 16px rgba(16,185,129,0.2)",
        "card": "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "gradient-purple": "linear-gradient(135deg, #23856C 0%, #196A55 100%)",
        "gradient-gold": "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
        "gradient-hero": "linear-gradient(135deg, rgba(35,133,108,0.15) 0%, rgba(59,130,246,0.08) 50%, rgba(16,185,129,0.05) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
