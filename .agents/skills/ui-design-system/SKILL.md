---
name: ui-design-system
description: >
  The visual and responsive quality bar for the INTVOICEKIT frontend, expressed in
  this repo's own tokens and utilities. Use when building or changing any UI —
  a new page, a redesign, spacing or typography work, a responsive fix, or a
  polish pass. Triggers on "improve the UI", "make this look better", "fix the
  spacing", "redesign this page", "make it responsive", "premium look".
---

# UI Design System

Paths below are relative to the repo root.

The theme is dark neon-cyber and **stays that way**. The reference is the
*discipline* of Apple, Linear, and the Vercel docs — one spacing grid, one type
scale, restraint with colour and motion, generous whitespace — not their light
palette. Every rule below points at a value that already exists in
`src/index.css` or `tailwind.config.ts`. Read those two files before styling
anything.

## Colour — tokens only

- Use the semantic Tailwind colours that map to the HSL vars: `bg-background`,
  `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`,
  `bg-primary` (teal `172 66% 50%`), `bg-destructive`.
- **Never hardcode a hex or an arbitrary `[#...]` class.** If a needed colour
  has no token, add one to `:root` in `src/index.css` and to
  `tailwind.config.ts`, then use it by name.
- Assistant runtime modes read from `mode.pipeline` / `mode.realtime` /
  `mode.cascade`. Do not invent a second colour for a mode anywhere.
- Opacity comes from the token: `bg-primary/10`, `border-border/60`. That is how
  every existing surface is tinted.

## Reuse the utilities before writing classes

`src/index.css` already defines the page vocabulary. Composing a page out of ad
hoc classes when one of these exists is the most common way this UI drifts:

| Need | Use |
|---|---|
| page wrapper | `page-shell` |
| page gutter | `page-padding` (`p-4 md:p-6 lg:p-8`) |
| centred column | `content-max` (`max-w-6xl mx-auto`) |
| status pill | `status-chip` + `status-chip-info` / `-neutral` / `-warning` |
| focused/active surface | `neon-border` |
| translucent panel | `glass` |

Check `src/components/common/` for an existing shell (`MasterDetailShell`,
`EmptyState`) before building a new layout.

## Spacing, radius, type

- **Spacing is Tailwind's 4px scale.** No arbitrary `px` values. Stack rhythm
  inside a card: `space-y-4`; between page sections: `space-y-6`.
- **The gap ladder is `gap-1` (4px), `gap-2` (8px), `gap-3` (12px),
  `gap-4` (16px), `gap-6` (24px), `gap-8` (32px) — and nothing between.**
  No `.5` spacing tokens (`gap-1.5`, `space-y-0.5`, …) anywhere in app code or
  vendored `src/components/ui/`. Job to value: card grids `gap-4`, compact
  stat/filter rows `gap-3`, icon+label clusters `gap-2`, inline dots `gap-1`.
  Padding/margin sizes (`py-2.5`, `px-1.5`, …) are control sizing, not
  inter-element gaps — they may stay off-ladder where a control needs it.
- **Radius comes from `--radius` (0.5rem)** through `rounded-lg` / `-md` /
  `-sm`. No per-component radius. `rounded-full` is for pills and avatars only.
- **Type is Inter (`font-sans`) and JetBrains Mono (`font-mono`).** Mono is for
  IDs, keys, phone numbers, and code — not for prose. Steps in use:
  `text-3xl font-bold` page title, `text-lg font-semibold` section, `text-sm`
  body, `text-xs text-muted-foreground` meta. Do not add a step between these.

## Responsive

Mobile-first. Design at 375, then let it widen. The five widths that matter are
the five the driver sweeps: **375, 768, 1024, 1440, 1920**.

- The dashboard sidebar is desktop-only; below `md` navigation is a Sheet
  (`src/routes/dashboard/DashboardLayout.tsx`). A new page inherits this — do
  not add a second mobile nav.
- Tables overflow on phones. Wrap in `overflow-x-auto`, or render a card list
  below `md`. Never let the page itself scroll sideways.
- Long values (IDs, URLs, transcripts) need `truncate` or `break-words`. An
  unbroken string is the usual cause of an overflow failure.
- Wide layouts stay readable: cap with `content-max`, do not let a form stretch
  to 1920px.

## Motion

Framer Motion and `tailwindcss-animate` are already here. Keep transitions at
150–250ms (`transition-all` on interactive elements is the existing pattern).
Animate to explain a change of state, never for decoration. Nothing that loops
forever except an actual live indicator — `pulse-neon` exists for that.

## States and accessibility

- Every interactive element needs hover, focus-visible, active, and disabled.
  Radix primitives in `src/components/ui/` give you these — use the primitive
  rather than a styled `div`.
- Buttons that trigger a request show a pending state; lists show loading,
  empty, and error states. `EmptyState` exists for the empty one.
- Body text must hit AA contrast over `--background` and `--card`.
  `text-muted-foreground` is the floor for readable text — do not go dimmer for
  anything a user has to read.
- Keep the tab order sensible and label icon-only buttons with `aria-label`.

## Before handing UI work back

Not adjectives — run the checks:

1. `node .agents/skills/run-intvoicekit-frontend/driver.mjs route <the route>` —
   zero overflow failures, zero console errors, at all five widths.
2. **Open the 375 and 1920 screenshots and look at them.** A green overflow
   check does not mean the page reads well.
3. No new hex colours, no arbitrary spacing values, no duplicated utility that
   `src/index.css` already provides.
4. It still looks like the same product. Improving the theme is in scope;
   replacing it is not.
