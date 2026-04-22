import type { Config } from "tailwindcss";

const noiseDataUrl =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#0f0f0f",
        card: "#111111",
        foreground: "#fafafa",
        muted: "rgba(250, 250, 250, 0.5)",
        accent: {
          DEFAULT: "#7C63FD",
          foreground: "#ffffff",
        },
        "border-subtle": "rgba(255, 255, 255, 0.05)",
        border: "rgba(255, 255, 255, 0.1)",
        "border-strong": "rgba(255, 255, 255, 0.2)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        noise: noiseDataUrl,
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(0.75rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.65s ease-out forwards",
        marquee: "marquee 45s linear infinite",
        "marquee-slow": "marquee 90s linear infinite",
      },
    },
  },
} satisfies Config;
