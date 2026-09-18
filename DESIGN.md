# Design Brief

## Direction

Aurora Protocol — a turn-based game HUD that lives inside the atmosphere it is trying to save, with every surface shifting between a smoggy and a restored mood.

## Tone

Atmospheric technical optimism: a dark, instrument-panel game UI (Space Grotesk + Geist Mono numerals) that stays hopeful — never dystopian, never cartoonish.

## Differentiation

A living atmosphere layer: the board backdrop is a layered twilight gradient that visually flips from amber smog at the polluted pole to clean cyan-green at the restored pole, mirrored by the restoration bar gradient.

## Color Palette

| Token      | OKLCH       | Role                                            |
| ---------- | ----------- | ----------------------------------------------- |
| background | 0.16 0.028 265  | Twilight indigo-slate canvas (dark-first)   |
| foreground | 0.95 0.012 250  | Primary text, high contrast                 |
| card       | 0.205 0.032 265 | HUD panels, stat bar, log, shop cards       |
| primary    | 0.78 0.145 178  | Clean-air cyan-green — restored pole, CTAs  |
| accent     | 0.76 0.155 68   | Smog amber — pollution warnings, costs      |
| muted      | 0.255 0.03 265  | Inactive controls, disabled shop items      |
| success    | 0.74 0.17 152   | Cleanup results, NPC output, gains          |
| warning    | 0.8 0.15 78     | Rising pollution, unaffordable items        |
| destructive| 0.6 0.21 28     | Game-over, failed actions                   |

Light mode (`.light`) is the restored-world counterpart: 0.975 0.012 210 background, 0.5 0.13 190 primary.

## Typography

- Display: Space Grotesk — HUD labels, headings, buttons, stat captions
- Body: DM Sans — event log, descriptions, shop copy, paragraphs
- Mono: Geist Mono — all numerals (pollution %, money, turn, costs), tabular-nums
- Scale: hero `text-5xl md:text-7xl font-bold tracking-tight`, h2 `text-3xl md:text-4xl font-bold tracking-tight`, hud-label `text-[0.6875rem] font-semibold uppercase tracking-[0.18em]`, hud-value `font-mono text-2xl font-semibold tabular-nums`, body `text-base`

## Elevation & Depth

Two-tier surface system: `bg-card` panels on `bg-background`, separated by 1px `border-border`, with `shadow-subtle` for resting cards and `shadow-elevated` for the HUD bar, modals, and shop drawer; the atmosphere gradient supplies depth behind the board instead of decorative blur.

## Structural Zones

| Zone        | Background                    | Border      | Notes                                                        |
| ----------- | ----------------------------- | ----------- | ------------------------------------------------------------ |
| HUD bar     | `bg-card` + `shadow-elevated` | `border-b`  | Sticky; 4 stat readouts split by thin vertical dividers       |
| Game board  | `.atmosphere` gradient layer  | `border`    | Central zone; skyline/sky illustration sits over the gradient |
| Action panel| `bg-card`                     | `border-l`  | Right column; action buttons + turn event log                 |
| Shop drawer | `bg-popover` + `shadow-elevated` | `border` | Overlay panel; item cards with cost/effect/level              |
| Bottom bar  | `bg-muted/40`                 | `border-t`  | Tienda button left, session/login + ranking right             |

## Spacing & Rhythm

Generous 4/6/8 spacing scale (`p-4`, `gap-6`, `space-y-8`) around HUD stats for glanceability, tightening to `gap-2`/`p-3` inside the event log and shop item rows; stat groups separated by `border-l` dividers rather than whitespace alone.

## Component Patterns

- Buttons: pill radius (`rounded-full`) for actions, `rounded-xl` for primary CTAs; primary actions use `gradient-primary` with `primary-foreground`; disabled shop items drop to `bg-muted` + `text-muted-foreground`
- Cards: `rounded-xl border border-border bg-card shadow-subtle`; HUD stat cards use `rounded-2xl`
- Badges: pill, uppercase `hud-label` type, colored by mood — amber for pollution, cyan-green for restoration, gold for money
- Progress bars: track `bg-muted`, fill `gradient-restored`; pollution gauge uses `gradient-smog` and reads as a segmented meter

## Motion

- Entrance: staggered `fade-in-up` on HUD stats and board panels, 300–400ms ease-out
- Hover: `transition-smooth` on buttons/cards — background lightens, shadow lifts, 200ms
- Decorative: slow `pulse-smog` on the pollution gauge when above 70%, gentle `float` on the board atmosphere layer

## Constraints

- Spanish-language UI copy throughout; all numerals in Geist Mono with tabular figures
- Pollution, restoration, money, and turn must be legible at a glance on desktop and mobile — minimum 4.5:1 contrast on all HUD text
- Tokens must express both polluted (amber/smog) and restored (cyan-green) moods without new hardcoded colors
- No purple gradients, no neon glow shadows, no raw hex or arbitrary Tailwind color classes in components
- Do not design space for multiplayer, achievements, multi-city campaigns, or random per-turn events

## Signature Detail

The atmosphere layer — a single gradient token (`--gradient-atmosphere`) that carries the game's entire emotional arc from smog to clear sky, reused behind the board and echoed in the restoration bar.
