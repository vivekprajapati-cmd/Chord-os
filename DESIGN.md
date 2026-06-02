# ChordOS — Design System

**Status:** Redesigned to match Chord agency aesthetic (liquid, editorial, typographic)

## Design Language

ChordOS now uses the Chord brand system — editorial, print-inspired, with tactile off-set shadows.

### Color Palette

| Token | Hex | Role |
|---|---|---|
| Cream | #F2EBD9 | Primary background |
| Paper | #FFFCF4 | Card/surface background |
| Ink | #0A0A0A | Primary text, borders |
| Cobalt | #2226D9 | Accent (links, hover) |
| Yellow | #F0E63C | Call-to-action, highlight |
| Red | #FF3B2F | Alerts, priority |
| Gray | #7A7468 | Secondary text |

### Typography

| Role | Font | Size | Usage |
|---|---|---|---|
| Display | Anton | 32–72px (clamp) | Headlines, hero |
| Body | Bricolage Grotesque | 14–16px | Content, descriptions |
| Italic | Fraunces | Varies | Emphasis, editorial |
| Mono | JetBrains Mono | 10–11px | Labels, CTAs, metadata |

### UI Elements

**Offset shadows** (no blur, always 8px 8px 0 ink):
- Cards, buttons, modals all use this — creates tactile, printed feel
- Subtle grain overlay fixed at 0.04 opacity (multiply blend mode)

**Buttons:**
- Pill-shaped (border-radius: 999px)
- 1px border, uppercase mono, tight letter-spacing
- Hover: fill or opacity change

**Cards:**
- 1.5px border, 12–18px border-radius
- 8px 8px 0 offset shadow
- --paper background

### Responsive

- Max content width: 1100px
- Section padding: 96px 28px (desktop), 64px 20px (mobile)
- Hero: min-height 100vh
- All text uses clamp() for fluid scaling

## Layout

**Nav:** Fixed top, numbered links (01–05), live lead badge
**Footer:** Accent line + ops tagline
**Main:** Single-column, centered, with breathing room

## Voice

- Greetings quirky: "you're up early", "let's build", "wrapping up"
- Copy is sharp, direct, no corporate fluff
- Emoji in CTAs: ✓ for approve, ↺ for rework, → for navigation

## Files Modified

- `app/globals.css` — design system tokens, grain overlay, utilities
- `app/(app)/layout.tsx` — fixed nav, numbered links, editorial brand treatment
- `app/(app)/dashboard/page.tsx` — hero greeting, stat cards with offset shadows
- `components/context-modal.tsx` — task detail modal with Chord aesthetic, quirky buttons

## Verification

After npm install, visit each page and verify:
1. **Dashboard** — Cream background, offset shadows on stat cards, quirky greeting
2. **Calendar** — Blocks with Chord styling, no drop shadows
3. **Tasks** — Task cards with 8px 8px 0 shadows
4. **Brands** — Brand detail with typography showcase
5. **Chat** — Message bubbles with editorial styling (team leads only)

No Tailwind hardcoded colors should be visible — all use CSS variables.
