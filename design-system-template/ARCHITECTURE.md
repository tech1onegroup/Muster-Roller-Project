# Architecture

## 3 Layers
1. **shadcn/ui** (engine) — Radix primitives + Tailwind + CVA. Accessibility, keyboard nav, ARIA, focus management. Invisible.
2. **Samsung One UI** (structure) — `--radius:1rem`, spacious padding, circular avatars, panel sidebars, bottom sheets, iOS-inspired spacing.
3. **One Group DESIGN.md** (skin) — `#762224` red, `#f5f3ed` canvas, Anthropic fonts. Final brand overlay.

## Themes
`one-group` (default) — brand overlay | `samsung-one-ui` — raw Samsung. Switch via `NEXT_PUBLIC_THEME`.

## Components (55)
**Input:** button, button-group, checkbox, input, input-group, input-otp, label, native-select, radio-group, select, slider, switch, textarea, toggle, toggle-group
**Layout:** accordion, card, collapsible, dialog, drawer, popover, resizable, scroll-area, separator, sheet, sidebar
**Nav:** breadcrumb, command, context-menu, dropdown-menu, menubar, navigation-menu, pagination, tabs
**Data:** alert, alert-dialog, avatar, badge, calendar, carousel, chart, hover-card, progress, skeleton, spinner, table, tooltip
**Util:** aspect-ratio, combobox, direction, empty, field, item, kbd, sonner

## Samsung Properties Enforced
1rem radius | spacious padding | circular avatars | panel sidebars | bottom sheet drawers | button groups | white-on-gray cards | toggle switches

## Responsive
Mobile-first via Tailwind. sm:640 md:768 lg:1024 xl:1280 2xl:1536. All components adapt.

## Fonts
Anthropic Serif/Sans/Mono in `/public/fonts/anthropic/`. **Internal only** — public products use Georgia/Inter/JetBrains Mono.
