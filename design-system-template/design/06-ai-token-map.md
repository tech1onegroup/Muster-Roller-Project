# 6. AI Token Map

For Stitch conversion. Skin classes replaced, layout classes untouched.

## Replacements
`bg-blue-*`/`bg-primary-*` → `bg-primary` | `bg-gray-50`/`bg-slate-50` → `bg-background` | `bg-white` → `bg-card` | `bg-gray-800+` → `bg-card` dark | `bg-gray-200` → `bg-secondary` | `bg-gray-100` → `bg-muted`
`text-gray-900` → `text-foreground` | `text-gray-600` → `text-muted-foreground` | `text-blue-*` → `text-primary` | `text-red-*` → `text-destructive`
`border-gray-*` → `border-border` | `ring-blue-*` → `ring-ring` | `divide-gray-*` → `divide-border`
`font-sans` → `font-sans` (Anthropic Sans) | `font-serif` → `font-heading` (Anthropic Serif) | `font-mono` → `font-mono`
`shadow-*` → ring `0px 0px 0px 1px var(--ring)`

## Layout (NEVER modify)
flex grid block inline hidden p-* m-* gap-* w-* h-* min-* max-* top-* bottom-* left-* right-* absolute relative fixed sticky z-* overflow-* col-span-* row-span-* grid-cols-* order-* justify-* items-* self-* grow shrink basis-* flex-row flex-col aspect-* container

## Order
Base theme → AI reads this map → skin replaced → layout preserved → CSS vars resolve → branded output
