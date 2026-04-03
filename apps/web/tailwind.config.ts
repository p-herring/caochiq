import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:        "#0C0C0F",
        surface: {
          DEFAULT: "#13131A",
          2:       "#1A1A22",
          3:       "#21212C",
        },
        border: {
          DEFAULT: "#1E1E2A",
          2:       "#2A2A38",
        },
        accent: {
          DEFAULT: "#F0B429",
          dim:     "rgba(240,180,41,0.12)",
        },
        t1:   "#E8E8F0",
        t2:   "#7878A0",
        t3:   "#40405A",
        // Keep brand mapped to accent (amber) for legacy references
        brand: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      fontFamily: {
        sans:    ["Barlow", "system-ui", "sans-serif"],
        display: ["Barlow Condensed", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        "glow-accent": "0 0 16px rgba(240,180,41,0.25)",
        "glow-green":  "0 0 16px rgba(34,197,94,0.2)",
        "glow-red":    "0 0 16px rgba(240,82,82,0.2)",
      },
    },
  },
  plugins: [],
} satisfies Config;
