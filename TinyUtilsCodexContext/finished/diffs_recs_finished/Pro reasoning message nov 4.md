Cavin — dropping in with the full audit, concrete fixes, and PR‑ready patches you can apply today. I kept it opinionated, safe, and fast. Deliverables are all here: prioritized punch‑list, diffs, tests, and ops notes — with download links for each patch.

------

## 1) **Audit Report (MARKDOWN)**

### TL;DR

- **Core tools work** in prod (DLF, Sitemap Delta, Wayback Fixer). APIs respond with JSON, and robots/HSTS logic exists and is generally solid.
- **Biggest gaps:** missing strict security headers/CSP, API responses are cacheable by intermediaries (yikes), a couple of beta tools should be behind a preview fence, and test coverage is thin (only one unit test).
- **Quick wins shipped as patches:** Security headers (+ CSP), API `Cache-Control: no-store`, preview fence for half‑working pages, `data-testid` for scheduler debug, `noindex` on beta pages, and a small test bundle covering API contracts & DLF invariants.

------

### P0 (Must fix before more feature work)

1. **APIs return cacheable JSON (no `Cache-Control`)**

- **Finding**: `api/check.js`, `api/sitemap-delta.js`, `api/wayback-fixer.js`, `api/metafetch.js`, and `api/health.js` omit `cache-control` → intermediaries/CDNs can store responses.

- **Impact**: Stale data + potential data leakage across tenants if misconfigured. Also complicates debugging.

- **Exact fix**: Set `Cache-Control: no-store` on all JSON API responses.
  *Patch:* `pr1-security-caching.diff` (adds header in the common `json/jsonResponse` helpers).

  - Example (existing function): `api/check.js` line ~8 (`const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });`) → add `headers.set('cache-control', 'no-store')`.

- **Acceptance**:

  ```bash
  curl -isX POST https://tinyutils.net/api/check -H 'content-type: application/json' \
    -d '{"mode":"list","urls":["https://example.com"]}' | grep -i '^cache-control:'
  # expected: cache-control: no-store
  ```

1. **No sitewide CSP / incomplete security headers**

- **Finding**: `vercel.json` has `X-Content-Type-Options` and `Referrer-Policy` only.

- **Impact**: Higher risk of XSS/Clickjacking and harder to reason about third‑party execution.

- **Exact fix**: Add strict headers via `vercel.json`:

  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

  - `X-Frame-Options: DENY`

  - `Permissions-Policy: geolocation=(), camera=(), microphone=(), usb=(), payment=(), browsing-topics=()`

  - **CSP** (tailored to what you actually use):

    ```
    default-src 'self';
    img-src 'self' data: https:;
    script-src 'self' 'unsafe-inline' https://plausible.io;
    connect-src 'self' https://plausible.io https://archive.org https://web.archive.org;
    style-src 'self' 'unsafe-inline';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self'
    ```

  *Patch:* `pr1-security-caching.diff`.

- **Acceptance**:

  ```bash
  curl -Is https://tinyutils.net/ | egrep -i 'content-security-policy|strict-transport-security|x-frame-options'
  ```

1. **Preview fence missing for half‑working tools (prod)**

- **Finding**: `tools/keyword-density.html`, `tools/meta-preview.html`, `tools/sitemap-generator.html` are ship‑adjacent but not hardened or fully validated.

- **Impact**: Users discover “half‑working” surfaces; SEO/quality risk.

- **Exact fix**: Add **Edge fence** and **rewrites** that:

  - Return **401** unless `x-preview-secret` header or `?preview_secret=` cookie is present.
  - If allowed, proxy the static page through.
  - Keep **DLF / Sitemap Delta / Wayback Fixer** public.
    *Patches:*
  - `pr3-preview-fence.diff` adds `api/fence.js`.
  - `pr1-security-caching.diff` (same file) adds `vercel.json` rewrites that route the beta pages through the fence.

- **Acceptance**:

  ```bash
  # 401 when secret absent
  curl -is https://tinyutils.net/tools/keyword-density/ | head -n 20
  # Now allow with query (sets cookie for 24h)
  curl -is "https://tinyutils.net/tools/keyword-density/?preview_secret=$PREVIEW_SECRET" | head -n 20
  # or allow with header
  curl -is https://tinyutils.net/tools/keyword-density/ -H "x-preview-secret: $PREVIEW_SECRET" | head -n 20
  ```

------

### P1 (Soon)

1. **Add `data-testid` hook for scheduler debug**

- **Finding**: DLF already surfaces scheduler meta in a `p.debug-scheduler`, but no stable test hook.

- **Impact**: E2E flakiness; hard to automate preview smokes.

- **Exact fix**: Add `data-testid="debug-scheduler"` to that element when `?debug=1`.
  *Patch:* `pr2-ux-noindex-debug.diff`.

- **Acceptance**:

  ```js
  // In DevTools console on /tools/dead-link-finder/?debug=1
  document.querySelector('[data-testid="debug-scheduler"]').textContent.includes('globalCap=')
  ```

1. **Make beta pages non-indexable**

- **Finding**: Beta tool HTMLs lack `<meta name="robots" content="noindex">`.
- **Impact**: Unfinished surfaces can leak into SERPs.
- **Exact fix**: Add `<meta name="robots" content="noindex">` to those pages.
  *Patch:* `pr2-ux-noindex-debug.diff`.
- **Acceptance**: View source for each beta page and confirm the meta tag is present.

1. **Public assets cache policy**

- **Finding**: Only `tools/wayback-fixer/demo/*` has a cache header.

- **Impact**: Either overly stale or under‑cached assets; inconsistent perf.

- **Exact fix**: Add `Cache-Control: public, max-age=600` to `/public/(.*)` via `vercel.json`.
  *Patch:* `pr1-security-caching.diff`.

- **Acceptance**:

  ```bash
  curl -Is https://tinyutils.net/public/styles.css | grep -i cache-control
  ```

------

### P2 (Nice‑to‑have)

1. **API contract docs in README**

- **Finding**: DLF returns `{ ok, meta, rows }`, others return `{ meta, … }` without `ok`. That’s fine, but it’s not consolidated in docs.
- **Impact**: Consumers guess shapes; tests drift.
- **Exact fix**: Brief section in `README.md` describing shape per endpoint + example blobs.
- **Acceptance**: README includes section **“API Contracts”** with examples.

1. **A11y polish**

- **Suggestions**: Ensure visible focus rings across custom buttons, add `aria-live="polite"` for toasts, verify table header stickiness at all breakpoints.
- **Acceptance**: Keyboard‑only run flows; Lighthouse a11y score stays ≥ 95.

1. **Observability**

- **Suggestion**: Minimal eventing to Plausible (e.g., DLF run start/end, error code counts) with opt‑in. Low‑noise logs beat “mystery outages”.
- **Acceptance**: Dashboard card with daily success/error counts.

------

## 2) **PR(s) / Patch Files** (ready to apply)

- **PR 1 — Security & Caching Hardening**
  Adds CSP + strict headers, API `Cache-Control: no-store`, public asset caching, and **rewrites** for the preview fence.
  **Download:** [pr1-security-caching.diff](sandbox:/mnt/data/patches/pr1-security-caching.diff)
- **PR 2 — UX Quick Wins (noindex + stable test hook)**
  Adds `data-testid="debug-scheduler"` and `noindex` metas to beta tools.
  **Download:** [pr2-ux-noindex-debug.diff](sandbox:/mnt/data/patches/pr2-ux-noindex-debug.diff)
- **PR 3 — Preview Fence (Edge)**
  Adds `api/fence.js` that gates beta tools in production behind `PREVIEW_SECRET`.
  **Download:** [pr3-preview-fence.diff](sandbox:/mnt/data/patches/pr3-preview-fence.diff)
- **PR 4 — Tests (Unit/Integration)**
  Adds:
  - `dlf_envelope_invariants.test.mjs` (ensures `meta.scheduler` even on error)
  - `api_contracts.test.mjs` (contracts for Sitemap Delta, Wayback Fixer, Metafetch with fetch mocks)
  - `csv_hardening.unit.test.mjs` (protects Excel formula cells)
    **Download:** [pr4-tests-contracts.diff](sandbox:/mnt/data/patches/pr4-tests-contracts.diff)

> **Note:** PR1 modifies `vercel.json` to include rewrites. Apply **PR1 and PR3** together so the fence route exists before the rewrites land.

------

## 3) **Test Plan & Added Tests**

Run locally (Node 20):

```bash
npm i   # or pnpm i
npm test
```

What’s included:

- **Unit**
  - `dlf_envelope_invariants.test.mjs` → GET /api/check returns JSON error with `meta.scheduler`.
  - `csv_hardening.unit.test.mjs` → prefixes dangerous CSV cells (e.g., `=`, `+`, `-`, `@`).
- **Integration (fetch mocked)**
  - `api_contracts.test.mjs` → Happy‑path JSON contracts for Sitemap Delta / Wayback Fixer / Metafetch; asserts `content-type: application/json; charset=utf-8`.

Smokes (prod/preview):

```bash
# Provided already in repo:
export TINYUTILS_BASE="https://tinyutils.net"
pnpm smoke:extras

# Preview smoke (CI or local)
export PREVIEW_URL="https://<vercel-preview-url>"
npm run smoke:preview
```

Artifacts: UI smokes (Tiny‑Reactive) already wired (`ui:smoke:dlf`, `ui:smoke:sd`, `ui:smoke:wbf`); screenshots go to `./.debug/`.

------

## 4) **Ops Notes**

**Secrets**

- `PREVIEW_SECRET` — shared secret to gate beta tools in production.
- `VERCEL_*` — standard Vercel env (unchanged here).

**Preview vs Prod smokes**

- **Preview**: Set `PREVIEW_URL` → `npm run smoke:preview`.
- **Prod**: `pnpm smoke:extras` uses `TINYUTILS_BASE` (defaults to https://tinyutils.net).

**Gated routes (after PR1+PR3)**

- `/tools/keyword-density(/index.html)`
- `/tools/meta-preview(/index.html)`
- `/tools/sitemap-generator(/index.html)`
  Use `?preview_secret=$PREVIEW_SECRET` once to set a cookie (24h), or send `x-preview-secret` header.

------

## 5) **PR‑ready Descriptions**

### PR 1 — Security & Caching Hardening

**Why:** Prevent intermediary caching of JSON, lock down attack surface with CSP & friends, and normalize asset caching.
**What:**

- Add `Cache-Control: no-store` to **all** API JSON responses.
- Add strict headers in `vercel.json`: HSTS, CSP, XFO, Permissions‑Policy.
- Add `Cache-Control: public, max-age=600` for `/public/(.*)`.
- Add rewrites for beta tools (used by the fence in PR3).
  **How to test:** See acceptance checks in P0/P1 above.

### PR 2 — UX Quick Wins

**Why:** Stabilize automation and keep beta pages out of search.
**What:**

- Add `data-testid="debug-scheduler"` in DLF when `?debug=1`.
- Add `<meta name="robots" content="noindex">` to beta tools.
  **How to test:** Open DLF with `?debug=1` and check for the test id; view‑source the beta pages.

### PR 3 — Preview Fence (Edge)

**Why:** Keep prod sharp; gate unfinished tools.
**What:**

- New `api/fence.js` (Edge). Accepts `x-preview-secret` or `?preview_secret=` and proxies the requested page if authorized (sets cookie).
  **How to test:** `curl` 401/200 flows as listed.

### PR 4 — Tests (Contracts + Invariants)

**Why:** Catch contract drift and harden merges.
**What:** Add three tests as described in the Test Plan.
**How to test:** `npm test` in Node 20.x.

------

## 6) **Concrete Diffs (snippets)**

> Full patches are attached above; here are representative hunks.

**API `no-store` header (example)** — `api/check.js`

```diff
 function json(status, body, requestId) {
-  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
+  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
+  headers.set('cache-control', 'no-store');
   if (requestId) headers.set('x-request-id', requestId);
   return new Response(JSON.stringify(body), {
     status,
     headers
   });
 }
```

**CSP & security headers** — `vercel.json`

```diff
   "headers": [
     {
       "source": "/(.*)",
       "headers": [
         { "key": "X-Content-Type-Options", "value": "nosniff" },
         { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
+        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
+        { "key": "X-Frame-Options", "value": "DENY" },
+        { "key": "Permissions-Policy", "value": "geolocation=(), camera=(), microphone=(), usb=(), payment=(), browsing-topics=()" },
+        { "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https://plausible.io; connect-src 'self' https://plausible.io https://archive.org https://web.archive.org; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
       ]
     },
+    { "source": "/public/(.*)", "headers": [ { "key": "Cache-Control", "value": "public, max-age=600" } ] }
```

**Preview fence** — `api/fence.js` (new)

```diff
+export const config = { runtime: 'edge' };
+// … accepts x-preview-secret or ?preview_secret=, proxies target page if allowed, else 401 JSON
```

**Stable test hook** — `tools/dead-link-finder/index.html`

```diff
-        debugSchedulerSummary.className = 'debug-scheduler';
+        debugSchedulerSummary.className = 'debug-scheduler';
+        debugSchedulerSummary.setAttribute('data-testid', 'debug-scheduler');
```

**Beta tools `noindex`** — e.g. `tools/meta-preview.html`

```diff
 <head>
+  <meta name="robots" content="noindex">
```

------

## 7) **CI / Preview‑first flow (recommended)**

- Current GH Actions already run `npm test` and a small preview smoke (good!).
- After merging PR4, tests cover more surface; I suggest:
  - **Auto‑merge** bot label when tests + preview smoke are green.
  - Tiny “victory lap” prod smoke job that just curls `/api/health` and `/api/check` with a single page list payload and checks headers/body shape.

------

## 8) **Next 3 Steps (plain‑English, zero‑code)**

1. **Ship PR1 + PR3 together**: security headers, `no-store`, and preview fence.
2. **Merge PR2**: stable test hook + `noindex` on beta pages.
3. **Adopt PR4**: extend contract tests; keep them green before any feature sprint.

If you want, I’ll bundle all of this into a prefilled GitHub Issue template with checkboxes and the exact `curl`/`npm` commands for a one‑shot handoff.

------

## 9) **How to run (copy‑paste)**

```bash
# Apply patches (from repo root)
git checkout -b chore/security-caching
git apply /path/to/pr1-security-caching.diff
git commit -am "security+caching: CSP, headers, API no-store, asset cache + rewrites"

git checkout -b feat/preview-fence
git apply /path/to/pr3-preview-fence.diff
git commit -am "preview fence: gate beta tools in prod"

git checkout -b chore/ux-noindex-hooks
git apply /path/to/pr2-ux-noindex-debug.diff
git commit -am "ux: add debug-scheduler test id + noindex on beta tools"

git checkout -b test/contracts
git apply /path/to/pr4-tests-contracts.diff
git commit -am "tests: API contracts + DLF invariants + CSV hardening"

# Local test
npm i
npm test

# Optional: smokes
export TINYUTILS_BASE="https://tinyutils.net"
pnpm smoke:extras
```

------

## 10) **Codex CLI prompts (if you’re delegating)**

- **“Harden CSP without breaking analytics”**
  *“Review `vercel.json` CSP after this PR lands. Ensure `plausible.io` loads, and that network calls to `archive.org`/`web.archive.org` succeed. If anything breaks, propose the minimal CSP relaxation with a rationale.”*
- **“UI a11y polish pass”**
  *“On `/tools/dead-link-finder/`, ensure keyboard focus is always visible, add `aria-live="polite"` for toast messages, and verify sticky table headers on narrow screens. Provide a minimal diff and Lighthouse before/after.”*
- **“API docs sync”**
  *“Add an ‘API Contracts’ section to README with example requests/responses for `/api/check`, `/api/sitemap-delta`, `/api/wayback-fixer`, `/api/metafetch`. Keep them short and copy‑pastable.”*

------

## Files you can download now

- **PR 1:** [Download](sandbox:/mnt/data/patches/pr1-security-caching.diff)
- **PR 2:** [Download](sandbox:/mnt/data/patches/pr2-ux-noindex-debug.diff)
- **PR 3:** [Download](sandbox:/mnt/data/patches/pr3-preview-fence.diff)
- **PR 4:** [Download](sandbox:/mnt/data/patches/pr4-tests-contracts.diff)

------

If you want this wrapped as a GitHub Issue with checkboxes + ready commands, say the word and I’ll format it cleanly. Meanwhile, ship PR1+PR3 together, then PR2 and PR4 — that keeps prod crisp while expanding coverage.
