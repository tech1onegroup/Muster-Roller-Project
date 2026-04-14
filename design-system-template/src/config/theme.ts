/**
 * Theme Configuration — One Group UI Library
 *
 * Two themes available:
 *   NEXT_PUBLIC_THEME=samsung-one-ui  → Raw Samsung One UI (Samsung Blue, Inter)
 *   NEXT_PUBLIC_THEME=one-group       → One Group brand overlay (One Group Red, Anthropic fonts)
 *
 * Default: "one-group" (brand overlay applied)
 *
 * Architecture:
 *   Layer 1: shadcn/ui components (Radix + Tailwind — the engine, invisible)
 *   Layer 2: Samsung One UI styling (rounded corners, spacious layout)
 *   Layer 3: One Group DESIGN.md brand overlay (colors, fonts, logo)
 */
const envTheme = process.env.NEXT_PUBLIC_THEME

export type Theme = "samsung-one-ui" | "one-group"

export const ACTIVE_THEME: Theme = (
  envTheme === "samsung-one-ui" || envTheme === "one-group"
    ? envTheme
    : "one-group"
) as Theme
