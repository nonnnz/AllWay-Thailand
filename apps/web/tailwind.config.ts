import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", md: "2rem", lg: "3rem" },
      screens: { "2xl": "1200px" },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans Thai Looped', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'Noto Serif Thai', 'serif'],
        hand: ['Caveat', 'Bradley Hand', 'cursive'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        thai: ['IBM Plex Sans Thai Looped', 'Noto Sans Thai', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          soft: "hsl(var(--surface-soft))",
          muted: "hsl(var(--surface-muted))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          soft: "hsl(var(--primary-soft))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
        },
        /* ── Moodboard category colors ── */
        chili: {
          DEFAULT: "hsl(var(--chili))",
          soft: "hsl(var(--chili-soft))",
        },
        jade: {
          DEFAULT: "hsl(var(--jade))",
          soft: "hsl(var(--jade-soft))",
        },
        indigo: {
          DEFAULT: "hsl(var(--indigo))",
          soft: "hsl(var(--indigo-soft))",
        },
        lotus: {
          DEFAULT: "hsl(var(--lotus))",
          soft: "hsl(var(--lotus-soft))",
        },
        lemongrass: {
          DEFAULT: "hsl(var(--lemongrass))",
          soft: "hsl(var(--lemongrass-soft))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          soft: "hsl(var(--destructive-soft))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        trust: {
          DEFAULT: "hsl(var(--trust))",
          soft: "hsl(var(--trust-soft))",
          foreground: "hsl(var(--trust-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "hsl(var(--warning-soft))",
          foreground: "hsl(var(--warning-foreground))",
        },
        "local-value": {
          DEFAULT: "hsl(var(--local-value))",
          soft: "hsl(var(--local-value-soft))",
          foreground: "hsl(var(--local-value-foreground))",
        },
        map: {
          water: "hsl(var(--map-water))",
          land: "hsl(var(--map-land))",
          route: "hsl(var(--map-route))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "20px",
        panel: "28px",
      },
      boxShadow: {
        warm: "0 1px 2px rgba(31,26,20,.05), 0 2px 6px rgba(31,26,20,.04)",
        "warm-lg": "0 8px 32px -10px rgba(31,26,20,.18), 0 4px 12px rgba(31,26,20,.06)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 220ms ease-out",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
