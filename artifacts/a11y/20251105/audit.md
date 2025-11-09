# TinyUtils Accessibility Spot Check — 2025-11-05 01:35 CET

Scope: `public/tools/sitemap-delta/index.html`, `public/tools/wayback-fixer/index.html`

## Findings
- Keyboard shortcuts (`e`, `j`, `f`, `Ctrl/⌘+Enter`) previously triggered while typing inside inputs/textarea, causing unintended downloads and focus jumps.
- No additional accesskey declarations or focus traps detected; tab order stays linear through primary controls and demo buttons.

## Fixes Applied
- Added `e.defaultPrevented` plus `target.closest('input, textarea, select, [contenteditable="true"])` guard before firing shortcut handlers to avoid hijacking while typing.

## Follow-ups
- Consider documenting available shortcuts in each UI so assistive tech users discover them without trial-and-error.
- Re-run a Lighthouse accessibility audit after any further UI adjustments.
