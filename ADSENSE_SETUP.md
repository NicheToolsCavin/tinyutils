# AdSense placeholders
Replace all occurrences of `ca-pub-REPLACE_ME` with your AdSense publisher ID and set valid `data-ad-slot` values from your AdSense account.

Files touched (Phase 1 landers)
- /tools/keyword-density.html
- /tools/meta-preview.html
- /ads.txt

## Phase 2: core `.ad-slot` placements

Phase 2 adds a single, unobtrusive, theme-aware ad slot per key TinyUtils page using a shared `.ad-slot` wrapper and existing CMP wiring.

Pages using `.ad-slot`:
- `/index.html` — one slot under the hero, above the tools grid.
- `/tools/index.html` — one slot under the "Tools" heading, above the cards.
- `/tools/dead-link-finder/index.html` — one slot inside the tool intro, below the description/CTA and above the main input card.
- `/tools/sitemap-delta/index.html` — one slot between the tool hero and the main "Sitemap" card.
- `/tools/wayback-fixer/index.html` — one slot inside the `wrap` container, below the tool heading and above the two-column controls.
- `/tools/text-converter/index.html` — one slot in the converter intro, below the description/CTA and above the input card.

Each slot uses the same basic markup:

```html
<section class="ad-slot" aria-label="Sponsored">
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-3079281180008443"
       data-ad-slot="1234567890"        <!-- replace with real slot id -->
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>try{(adsbygoogle = window.adsbygoogle || []).push({});}catch(e){}</script>
</section>
```

Styling and behavior:
- `.ad-slot` is styled in `styles/site.css` using existing tokens (`--panel`, `--border`, `--text`, `--radius`) and a small `min-height` to reserve space and reduce layout shift.
- When the local "hide ad UI" preference is on (`tu-ads-hidden`), `scripts/consent.js` adds `html.ads-hidden`, and all `.ad-slot` containers are hidden via CSS (`html.ads-hidden .ad-slot { display:none !important; }`). This only affects our UI, not Google’s serving logic.
- All pages already include:
  - The Google Funding Choices / CMP script (pub-3079281180008443).
  - The AdSense loader script with `?client=ca-pub-3079281180008443`.
  - `scripts/consent.js` and `scripts/adsense-monitor.js`.
- Funding Choices governs whether AdSense can run personalized vs non-personalized ads; `adsense-monitor.js` simply shows a small toast if `window.adsbygoogle` never initializes.

## QA / smokes (future checks)

When validating ads on Preview/production, spot-check the following:
- CMP / consent
  - Landing fresh in an EU-like environment shows the Funding Choices dialog.
  - Accepting ads/measurement allows AdSense to render; declining keeps signals conservative (non-personalized or disabled, depending on Google config).
- Ad visibility
  - On each of the six pages above, exactly one `.ad-slot` is present and renders (when Google serves an ad) without overlapping tool controls.
  - Toggling the local hide-ads preference (driven by `tu-ads-hidden` / `html.ads-hidden`) hides all `.ad-slot` containers while leaving navigation and tools fully usable.
- Layout / CLS
  - On a cold load, the space reserved by `.ad-slot` is sufficient that ads appear without jarring layout shifts, especially on mobile.
  - Dark and light themes both render ad frames with readable text and borders (the frame uses the same `--panel`/`--border` tokens as cards).

Notes:
- Keep homepage and tools light: do not add additional slots without updating this file and AGENTS.md.
- After changing slot IDs or adding new placements, re-run preview smokes and a quick manual QA pass to confirm CMP behavior, ad visibility, and CLS remain acceptable.

## Consent and Funding Choices CMP

TinyUtils uses Google Funding Choices as the **canonical source of consent** for both analytics and ads.

On key pages (home, tools hub, and the main tools listed above) we include:
- The Funding Choices CMP script (pub-3079281180008443).
- `scripts/consent.js` — manages the local "hide ads" UI (via the `tu-ads-hidden` key and `html.ads-hidden` class) and exposes a small adapter object at `window.TinyUtilsConsent`.
- `scripts/googlefc-consent-adapter.js` — a bridge that listens to Funding Choices / Consent Mode and maps its state into `TinyUtilsConsent.hasAnalyticsConsent()` and `TinyUtilsConsent.hasAdsConsent()`.
- `scripts/analytics.js` — loads Vercel Web Analytics **only** when `TinyUtilsConsent.hasAnalyticsConsent()` returns `true`.
- `scripts/adsense-monitor.js` — shows a small adblock toast **only** when:
  - The hostname is a production/preview host,
  - The user has opted in to ads via `localStorage.ads === 'on'`, and
  - `TinyUtilsConsent.hasAdsConsent()` returns `true`.

Important details:
- Funding Choices is the **single source of truth** for consent. TinyUtils never tries to infer consent from its own banner or keys; local logic is just an adapter.
- If Funding Choices or Consent Mode are blocked, `googlefc-consent-adapter.js` leaves `TinyUtilsConsent` in its default, permissive state. This avoids breaking tools when CMP fails to load, while still allowing future tightening as needed.
- The "hide ads" toggle only affects visibility of `.ad-slot` containers in our UI (it does **not** signal consent or change Google’s serving logic).
