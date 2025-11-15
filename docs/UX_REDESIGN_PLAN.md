# TinyUtils — UX/UI Redesign Plan (post‑stability)

Goal
- After critical bugs and converter quality issues are resolved, redesign the interface for a modern, cohesive look while preserving performance and accessibility.

Principles
- Performance first (static where possible, minimal JS, small CSS).
- A11y AA+ (visible focus, color contrast, keyboard flows, aria‑live updates).
- Design tokens (colors, space, radius, typography) derived from Wayback Fixer theme.
- Component consistency across all tools.

Scope (Phased)
- Tokens: extract variables into `/styles/site.css` (colors, spacing, radii, shadows, z‑index).
- Typography: set a modular scale, heading/body/mono stacks, rhythm.
- Grid/Layout: container widths, responsive breakpoints, card layouts, sticky header behavior.
- Components: buttons (primary/secondary/ghost), inputs/textareas, tables (.tableWrap with sticky thead), toasts, badges, progress rows.
- Tool shells: unify header/hero/sections across DLF, Sitemap Delta, Wayback Fixer, Converter.
- Theming hooks: prefer CSS variables; minimal classes; no runtime theme switching.

Deliverables
- Component gallery page under `/public/components.html` (non‑indexed) rendering all components with tokens.
- Before/after screenshots for 6 key pages; Agent Mode annotations.
- A11y report (axe or manual checklist) with issues + fixes tracked.

Dependencies/Non‑goals
- No framework migration. Keep Framework=Other on Vercel.
- No new runtime deps. CSS‑only where feasible.

Gate to start
- Converter PR A/B shipped; preview smoke green across tools; cost safety checklist applied to any external PDF renderer.

Timeline (indicative)
- Week 1: Tokens + typography + grid + component gallery.
- Week 2: Apply to pages/tools; fix regressions; a11y pass; screenshots.

Evidence
- Store assets under `artifacts/ux-redesign/<YYYYMMDD>/` and log via scripts.
