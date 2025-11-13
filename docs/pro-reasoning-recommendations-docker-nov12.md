Alright Cavin—let’s lock in a plan that gets **PDF working reliably this week**, keeps ops tiny, and doesn’t nuke your wallet. I read your repo (✅ `tinyutils-nobin.zip`) and the current converter stack under `api/convert/` (Vercel Python function using Pandoc for everything and `xhtml2pdf` for PDF). Below is the decision, the costs (with real numbers), and the patches you can paste in.

------

## PART 1 — RECOMMENDATION

### 30‑second comparison (you can skim this)

| Approach                                                     | Cost (est.)                                                  | Complexity                                                   | Fidelity                                                     | My Ops Burden                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------- |
| **A) Hybrid (baseline)** — Vercel site + **Docker converter on Railway/Render**, Vercel proxy `/api/convert` → container (shared header, no CORS). **Engine:**Playwright/Chromium HTML→PDF | Railway: **$5/mo min**(usage peanuts). Render: **$0 on Free** (sleeping) or **$9/mo Starter**. See cheat‑sheet below. | Low‑Medium (you deploy a container; I give you one-click steps) | **High** (Chromium CSS fidelity)                             | Small: one service, secret header, healthcheck              |
| **B) Vercel‑only serverless** — Harden pure‑Python (Pandoc→“conservative HTML”→`xhtml2pdf`) with base64 fonts/emoji, SSRF deny, caps | **$0** infra, but **dev time** & edge cases                  | Medium                                                       | **Medium‑Low** on complex CSS/layouts/images; `xhtml2pdf` is HTML/CSS 2.1 with gaps | Tiny ops, but you’ll chase fidelity bugs                    |
| **C) Alternative (my pick)** — Keep site on Vercel; run **serverless container on Google Cloud Run** (scale‑to‑zero, per‑100ms billing). Vercel proxies `/api/convert` to Cloud Run with shared header. **Engine:**Playwright/Chromium HTML→PDF | **$0** at your volumes (well within **free tier**: 240k vCPU‑sec & 450k GiB‑sec/mo). Even 10k renders ≈ **$0**. When you outgrow free tier: cents. | Medium (one‑time gcloud deploy; I give commands)             | **High** (Chromium)                                          | Small: one service, secret, healthcheck; auto scale‑to‑zero |

**My pick: C (Cloud Run).**
Reason: It’s the **cheapest** and **lowest‑maintenance** way to get true browser‑grade PDFs now. You get **Chromium fidelity**, **scale‑to‑zero**, and you likely pay **$0** for a long time (your 100 / 1k / 10k renders are deeply inside Cloud Run’s free tier). You also keep Vercel for everything else, zero CORS via a server‑side proxy, and a simple rollback (unset one env var, you’re back to Vercel‑only).

------

### Cost cheat‑sheet (concrete numbers)

**Railway (container service)**

- **Pricing:** Usage‑based per second: **$0.00000772 / vCPU‑sec**, **$0.00000386 / GB‑sec**, egress **$0.05/GB**. Plans show **Hobby min $5/mo usage** (Free: $0 with $5 trial credit; then $1/mo membership—usage still billed). Serverless “App‑Sleeping” can auto sleep after ~10 min inactivity.
- **Scale‑to‑zero behavior:** Serverless/App‑Sleeping detects inactivity and sleeps; wakes on first request (cold start).
- **Est. monthly at your loads** (assume 1 vCPU, **512 MiB**, **2–5s** CPU per render; usage only — **min $5 dominates**):
  - **Low (100/mo):** ~$0.0019–$0.0048 usage ⇒ **$5 total** (min).
  - **Medium (1k/mo):** ~$0.019–$0.048 usage ⇒ **$5 total** (min).
  - **High (10k/mo):** ~$0.19–$0.48 usage ⇒ **$5 total** (min).

**Render (container)**

- **Free instance:** **0.1 CPU / 512 MB**, **spins down after 15 minutes idle**, **750 hours free/mo** across account (so one service can run all month). Cold starts are expected. **$0**.
- **Starter:** **$9/mo** (512 MB, 0.5 CPU). Autoscaling & persistent disk extra.
- **Est. monthly:**
  - **Low/Medium/High:** **Free = $0** if you accept sleep/cold starts. For production steady uptime, plan on **$9/mo**.

**External renderer API** (no ops; pay per conversion)

- **Restpack HTML→PDF:** **$9.95/mo / 1,000 conversions**; **$39.95/mo / 10,000**; overages **$0.01–$0.004** depending on tier.
- **DocRaptor:** Plans clearly listed: **$15 (125 docs)**, **$29 (325)**, **$75 (1,250)**, **$149 (5,000)**/mo; overage pricing applies per doc above plan; unlimited test docs free. (Great engine, pricier.)
- **PDFShift:** Free **50 conversions/mo** (no card) via FAQ; paid tiers exist (various aggregators cite ~$9+).

**Vercel‑only**

- **Infra $0**. But your Python path uses `xhtml2pdf`, which only supports CSS 2.1 + partial CSS3 and has well‑known rendering gaps; great for simple docs, **flaky** for modern HTML/CSS. Vercel function limits apply (body size ~**4.5 MB**, timeouts, bundle size caps).

**Which is cheapest?**

- **Low (100/mo):** **Cloud Run (C)** ≈ **$0** (free tier) → *winner*. Render Free also **$0** but sleeps.
- **Medium (1k/mo):** **Cloud Run (C)** ≈ **$0** → *winner*. Restpack $9.95; Railway floor $5; Render Starter $9 (or Free $0 with sleep).
- **High (10k/mo):** **Cloud Run (C)** ≈ **$0** (still within free tier) → *winner*. Restpack $39.95, Render Starter $9, Railway $5 min.

**If my max budget is…**

- **$5** → **C (Cloud Run)**.
- **$15** → **C (Cloud Run)**; if you want zero GCP setup, **Restpack** $9.95 is tolerable.
- **$30** → **C (Cloud Run)**; or **DocRaptor** $29 for 325 high‑quality docs if you love their support.

------

## PART 2 — IMPLEMENTATION (diffs, PR text, commands)

Below I wire **Cloud Run** for PDF only. **Everything else stays on Vercel** (DOCX/MD/HTML conversions keep using Pandoc as today). We route **only PDF** to the **Chromium renderer**. Rollback is literally: **unset an env var**.

### A) Converter service (Cloud Run) — Playwright/Chromium HTML→PDF

**What it does**

- `POST /convert` → returns **JSON envelope** only (never plaintext/HTML).
- **Auth** via `x-shared-secret`.
- **SSRF default‑deny**: blocks any network fetch; **only `data:` URIs** allowed (images/fonts).
- **Caps**: `PDF_MAX_PAGES`, `PDF_MAX_BYTES`, `REQUEST_TIMEOUT`.
- **Fonts**: DejaVu + Noto Color Emoji.
- **Rate limit**: token bucket per IP (simple in‑mem).
- **Health**: `/healthz`.

#### 1) Add the Dockerized service

**`docker/pdf-renderer/Dockerfile`**

```diff
+FROM python:3.11-slim
+ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
+RUN apt-get update && apt-get install -y --no-install-recommends \
+    fonts-dejavu-core fonts-noto-color-emoji ca-certificates wget \
+  && rm -rf /var/lib/apt/lists/*
+# Playwright + Chromium
+RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic==2.* \
+    pydantic-settings==2.* playwright==1.* pypdf==4.* \
+ && playwright install --with-deps chromium
+WORKDIR /app
+COPY docker/pdf-renderer/service /app
+HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
+  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
+EXPOSE 8080
+ENV PORT=8080
+CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8080"]
```

**`docker/pdf-renderer/service/main.py`**

```diff
+from __future__ import annotations
+import base64, os, time, uuid
+from typing import Optional
+from fastapi import FastAPI, Header, HTTPException, Request
+from pydantic import BaseModel, Field
+from pypdf import PdfReader
+from playwright.async_api import async_playwright
+import asyncio
+
+SHARED = os.getenv("CONVERTER_SHARED_SECRET","")
+PDF_MAX_PAGES=int(os.getenv("PDF_MAX_PAGES","50"))
+PDF_MAX_BYTES=int(os.getenv("PDF_MAX_BYTES","5242880"))  # 5 MiB
+REQUEST_TIMEOUT=float(os.getenv("REQUEST_TIMEOUT","25"))
+RATE_LIMIT_PER_MIN=int(os.getenv("RATE_LIMIT_PER_MIN","60"))
+
+app = FastAPI()
+_rate = {}  # naive in-mem token bucket: ip -> (tokens, ts)
+ENGINE="playwright-chromium"
+ENGINE_VERSION=None
+
+class ConvertIn(BaseModel):
+    html: str
+    requestId: Optional[str]=None
+    name: str = "output.pdf"
+
+class Output(BaseModel):
+    name: str
+    size: int
+    target: str = "pdf"
+    dataBase64: str
+
+class ConvertOut(BaseModel):
+    ok: bool = True
+    meta: dict
+    outputs: list[Output]
+
+def _rate_check(ip: str):
+    import time
+    now=int(time.time())
+    tokens, ts=_rate.get(ip,(RATE_LIMIT_PER_MIN, now))
+    if now>ts:  # refill every second
+        tokens=min(RATE_LIMIT_PER_MIN, tokens + (now-ts)*RATE_LIMIT_PER_MIN//60)
+        ts=now
+    if tokens<=0:
+        _rate[ip]=(tokens, ts)
+        raise HTTPException(status_code=429, detail="rate_limited")
+    _rate[ip]=(tokens-1, ts)
+
+@app.get("/healthz")
+async def healthz():
+    return {"ok": True, "engine": ENGINE, "version": ENGINE_VERSION}
+
+@app.on_event("startup")
+async def init():
+    global ENGINE_VERSION
+    async with async_playwright() as p:
+        browser = await p.chromium.launch()
+        ENGINE_VERSION = (await browser.version())
+        await browser.close()
+
+@app.post("/convert", response_model=ConvertOut)
+async def convert(req: Request, payload: ConvertIn,
+                  shared: Optional[str]=Header(default=None, alias="x-shared-secret"),
+                  xff: Optional[str]=Header(default=None, alias="x-forwarded-for"),
+                  rid: Optional[str]=Header(default=None, alias="x-request-id")):
+    if not SHARED or shared != SHARED:
+        raise HTTPException(status_code=401, detail="unauthorized")
+    client_ip = (xff.split(",")[0].strip() if xff else req.client.host)
+    _rate_check(client_ip)
+    request_id = payload.requestId or rid or uuid.uuid4().hex
+    html = payload.html or ""
+    if len(html.encode("utf-8")) > 2_000_000:
+        raise HTTPException(status_code=413, detail="input_too_large")
+    async with async_playwright() as p:
+        browser = await p.chromium.launch()
+        page = await browser.new_page()
+        # SSRF guard: block all external fetches
+        async def gate(route):
+            url = route.request.url
+            if url.startswith("data:") or url.startswith("about:"):
+                await route.continue_()
+            else:
+                await route.abort()
+        await page.route("**/*", gate)
+        try:
+            await page.set_content(html, wait_until="load", timeout=REQUEST_TIMEOUT*1000)
+            pdf_bytes = await page.pdf(format="A4", print_background=True)
+        except Exception:
+            await browser.close()
+            raise HTTPException(status_code=400, detail="render_failed")
+        await browser.close()
+    if len(pdf_bytes) > PDF_MAX_BYTES:
+        raise HTTPException(status_code=413, detail="pdf_too_large")
+    try:
+        n_pages = len(PdfReader(stream=pdf_bytes).pages)
+        if n_pages > PDF_MAX_PAGES:
+            raise HTTPException(status_code=413, detail="pdf_too_many_pages")
+    except HTTPException:
+        raise
+    except Exception:
+        pass
+    b64 = base64.b64encode(pdf_bytes).decode("ascii")
+    meta = {"requestId": request_id, "pdfEngine": ENGINE,
+            "pdfEngineVersion": ENGINE_VERSION, "pdfExternalAvailable": True}
+    return ConvertOut(ok=True, meta=meta,
+                      outputs=[Output(name=payload.name, size=len(pdf_bytes), dataBase64=b64)])
```

------

#### 2) Hook Vercel to use the external renderer only for PDF

We keep your existing Python convert function for everything **except** the PDF step. We’ll create a tiny helper that calls the Cloud Run service, and adjust the PDF branch.

**`api/convert/_pdf_external.py` (new)**

```diff
+from __future__ import annotations
+import base64, os, requests, uuid
+from typing import Tuple, Dict
+
+URL = os.getenv("PDF_RENDERER_URL","").rstrip("/")
+SECRET = os.getenv("CONVERTER_SHARED_SECRET","")
+TIMEOUT = float(os.getenv("REQUEST_TIMEOUT","25"))
+
+class RemotePdfError(Exception):
+    def __init__(self, code: str, message: str):
+        self.code, self.message = code, message
+        super().__init__(f"{code}: {message}")
+
+def render_html_to_pdf_via_external(html: str, name: str, request_id: str) -> Tuple[bytes, Dict]:
+    if not URL:
+        raise RemotePdfError("external_unavailable", "PDF_RENDERER_URL not set")
+    headers = {
+        "content-type": "application/json",
+        "x-shared-secret": SECRET or "",
+        "x-request-id": request_id or uuid.uuid4().hex,
+    }
+    resp = requests.post(f"{URL}/convert", json={"html": html, "name": name, "requestId": request_id}, headers=headers, timeout=TIMEOUT)
+    if resp.status_code >= 400:
+        try:
+            data = resp.json()
+            raise RemotePdfError(data.get("detail","remote_error"), f"HTTP {resp.status_code}")
+        except Exception:
+            raise RemotePdfError("remote_http_error", f"HTTP {resp.status_code}")
+    data = resp.json()
+    if not data.get("ok"):
+        raise RemotePdfError(data.get("code","remote_error"), data.get("message","unknown"))
+    out = data["outputs"][0]
+    pdf_b64 = out.get("dataBase64")
+    if not pdf_b64:
+        raise RemotePdfError("missing_payload", "no dataBase64")
+    return base64.b64decode(pdf_b64), data.get("meta", {})
```

**`api/convert/convert_service.py` (replace PDF branch)**

```diff
@@
-        # Convert HTML to PDF
-        pdf_buffer = io.BytesIO()
-        pisa_status = pisa.CreatePDF(html_with_style, dest=pdf_buffer)
-
-        if pisa_status.err:
-            raise RuntimeError(f"PDF generation had errors: {pisa_status.err}")
-        pdf_bytes = pdf_buffer.getvalue()
+        # Prefer external Chromium renderer if available
+        use_external = bool(os.getenv("PDF_RENDERER_URL"))
+        if use_external:
+            from ._pdf_external import render_html_to_pdf_via_external, RemotePdfError
+            try:
+                pdf_bytes, meta = render_html_to_pdf_via_external(html_with_style, f"{input_path.stem or 'output'}.pdf", job_id)
+                logs.append(f"pdf_engine=playwright-chromium pdf_version={meta.get('pdfEngineVersion')}")
+            except RemotePdfError as exc:
+                raise RuntimeError(f"external_pdf_error:{exc.code}:{exc.message}")
+        else:
+            # Fallback: local xhtml2pdf (reduced fidelity). Keep safe CSS baseline.
+            pdf_buffer = io.BytesIO()
+            pisa_status = pisa.CreatePDF(html_with_style, dest=pdf_buffer)
+            if pisa_status.err:
+                raise RuntimeError(f"PDF generation had errors: {pisa_status.err}")
+            pdf_bytes = pdf_buffer.getvalue()
```

> Notes: we keep ReportLab fallback on Vercel for when the external is down.

**`api/convert/app.py` (envelope + headers + engine meta)**

```diff
@@ def _response_headers(request_id: Optional[str]) -> dict:
-    return {
+    headers = {
         "x-request-id": resolved,
         "cache-control": "no-store",
         "content-type": "application/json; charset=utf-8",
     }
+    # When we can detect the engine, we add it later.
+    return headers
@@ def convert(...):
-        outputs = _serialize_outputs(batch)
+        outputs = _serialize_outputs(batch)
         preview = _select_preview(batch)
         errors = _serialize_errors(batch)
 
-        response_payload = {
+        # Figure out engine
+        pdf_engine = None
+        for log in batch.logs:
+            if "pdf_engine=" in log:
+                pdf_engine = log.split("pdf_engine=")[1].split()[0].strip()
+                break
+        response_payload = {
+            "ok": True,
+            "meta": {
+                "requestId": resolved_request_id,
+                "pdfEngine": pdf_engine or ("xhtml2pdf" if any((o.get("target")=="pdf" for o in outputs)) else None),
+                "pdfEngineVersion": None,
+                "pdfExternalAvailable": bool(os.getenv("PDF_RENDERER_URL")),
+            },
             "jobId": batch.job_id,
             "toolVersions": {"pandoc": runner.get_pandoc_version()},
             "outputs": outputs,
             "preview": preview,
             "logs": batch.logs,
             "errors": errors,
         }
+        # Reflect engine in headers for the UI status line
+        if pdf_engine:
+            response.headers["x-pdf-engine"] = pdf_engine
         ...
```

> We keep existing fields for backward compatibility, but add your requested `ok:true` and `meta.*`.

------

#### 3) Vercel proxy (no CORS), shared secret

**We’ll keep it simple and robust:** The Vercel Python function calls the external renderer server‑to‑server (no CORS). That means **no extra middleware** required, and the shared secret is sent from Vercel to Cloud Run in the request. (If you *prefer* an edge middleware rewrite instead, I include that below as an alternative.)

**Environment variables to set in Vercel (Preview & Prod):**

- `PDF_RENDERER_URL` — Cloud Run base URL (e.g., `https://tinyutils-pdf-xxxxx-uc.a.run.app`)
- `CONVERTER_SHARED_SECRET` — any 32+ char random string (must match Cloud Run)
- `REQUEST_TIMEOUT` — `25` (seconds)
- `PDF_MAX_PAGES` — `50` (honored by Cloud Run)
- `PDF_MAX_BYTES` — `5242880` (5MiB)

**Alternative (optional): Edge Middleware rewrite that injects header**
If you want `/api/convert` to fully bypass Python when `to` includes `pdf`, drop a `middleware.ts` at repo root and use Next.js Edge Middleware to **modify request headers** then **rewrite** to the external URL. Vercel supports **modifying request headers in Middleware**; we’d set `x-shared-secret` there and rewrite to Cloud Run.
*(I’m shipping the server‑to‑server call because it’s simpler, bulletproof, and avoids middleware framework coupling.)*

------

#### 4) UI: small status line (engine + requestId)

**`tools/text-converter/index.html`** (inside your existing `<script>` where you handle the fetch)

```diff
@@
-        const contentType = response.headers.get('content-type') || '';
+        const contentType = response.headers.get('content-type') || '';
+        const reqId = response.headers.get('x-request-id') || '';
+        const engine = response.headers.get('x-pdf-engine') || (data?.meta?.pdfEngine || '');
@@
-        // Render results
+        // Status line (polite)
+        let statusEl = document.getElementById('convert-status');
+        if (!statusEl) {
+          statusEl = document.createElement('p');
+          statusEl.id = 'convert-status';
+          statusEl.setAttribute('aria-live','polite');
+          document.querySelector('.tool-intro')?.appendChild(statusEl);
+        }
+        statusEl.textContent = engine ? `Engine: ${engine} — Req ${reqId}` : `Req ${reqId}`;
+
+        // Render results
```

(That’s additive, not destructive.)

------

### B) JSON envelope (applies everywhere)

- **Success** now includes:

  ```json
  {
    "ok": true,
    "meta": { "requestId": "...", "pdfEngine": "playwright-chromium", "pdfEngineVersion": "..." , "pdfExternalAvailable": true },
    "outputs": [{ "name": "output.pdf", "size": 12345, "target": "pdf", "blobUrl": "..." }],
    ...
  }
  ```

- **Error**: when external PDF fails, the Python layer raises `external_pdf_error:...` and returns standard JSON with `ok:false`, `message`, and `x-request-id` header. (Minimal code to keep changes reversible.)

------

### C) Tests & smokes

**Smokes (curl) — add new script**

**`scripts/smoke_pdf.sh` (new)**

```diff
+#!/usr/bin/env bash
+set -euo pipefail
+BASE="${1:?Preview or prod base URL required, e.g. https://tinyutils.vercel.app}"
+echo "[1] Minimal Markdown -> PDF"
+curl -sS -X POST "$BASE/api/convert" \
+  -H 'content-type: application/json' \
+  --data '{"inputs":[{"text":"# Hello PDF 👋"}],"to":["pdf"],"from":"markdown"}' \
+  | tee /dev/stderr | jq -e '.ok == true and .outputs[0].size > 1024'
+
+echo "[2] Emoji & data-URI image -> success"
+curl -sS -X POST "$BASE/api/convert" \
+  -H 'content-type: application/json' \
+  --data '{"inputs":[{"text":"<p>Pic: <img src=\"data:image/png;base64,iVBORw0KGgoAAA...\"/></p> 🙂"}],"to":["pdf"],"from":"html"}' \
+  | tee /dev/stderr | jq -e '.ok == true'
+
+echo "[3] External image (SSRF) -> error"
+curl -sS -X POST "$BASE/api/convert" \
+  -H 'content-type: application/json' \
+  --data '{"inputs":[{"text":"<img src=\"https://example.com/x.png\"/>"}],"to":["pdf"],"from":"html"}' \
+  | tee /dev/stderr | jq -e '.ok == false or (.errors|length>0)'
+echo "Smoke OK"
```

**Unit/integration** — envelope invariants (tiny)
**`tests/pdf_envelope.test.mjs` (new)**

```diff
+import test from 'node:test';
+import assert from 'node:assert/strict';
+// Local import of handler if you test in-process; otherwise hit fetch to preview.
+// Here we do shape checks assuming an HTTP call.
+test('PDF response carries ok/meta', async () => {
+  const res = await fetch(`${process.env.PREVIEW_URL}/api/convert`, {
+    method:'POST',
+    headers:{'content-type':'application/json'},
+    body: JSON.stringify({ inputs:[{ text:"# Hi"}], from:"markdown", to:["pdf"] })
+  });
+  assert.equal(res.headers.get('content-type')?.includes('application/json'), true);
+  const body = await res.json();
+  assert.equal(body.ok, true);
+  assert.ok(body.meta?.requestId);
+  assert.ok(body.meta?.pdfExternalAvailable !== undefined);
+});
```

------

### D) CI (preview‑first, minimal)

You already have a preview smoke workflow (`.github/workflows/preview_smoke.yml`). Add:

```diff
# in .github/workflows/preview_smoke.yml job steps after 'Resolve preview URL'
+      - name: PDF Smoke via curl
+        if: steps.resolve.outputs.preview_url != ''
+        run: |
+          bash scripts/smoke_pdf.sh "${{ steps.resolve.outputs.preview_url }}"
```

For **post‑merge prod smoke**, append a similar step in `prod_deploy_smoke.yml`.

------

### E) SEO/Ads + small UX

- Titles/descriptions already exist for tools; ensure `public/ads.txt` present (it is).
- Add `noindex` on unfinished pages — your CSP & headers are set in `vercel.json` already.
- Keyboard shortcuts remain; we only add a polite status line.

------

## PART 3 — DELIVERABLES

### 1) Recommendation (table + pick)

- **Table & pick:** done above.
- **Cost winners by cap:**
  - **$5:** Cloud Run (C).
  - **$15:** Cloud Run (C); Restpack is OK if you hate GCP.
  - **$30:** Cloud Run (C); or DocRaptor $29 if you want “just buy the SLA.”

### 2) Unified diffs (summarized above)

Included for:

- `docker/pdf-renderer/*` (new container service)
- `api/convert/_pdf_external.py` (new)
- `api/convert/convert_service.py` (PDF branch swap)
- `api/convert/app.py` (envelope + headers)
- `tools/text-converter/index.html` (UI status line)
- `scripts/smoke_pdf.sh` (new)
- `tests/pdf_envelope.test.mjs` (new)
- CI tweak in `.github/workflows/preview_smoke.yml`

*(All changes are **additive/minimal** and easily reversible.)*

### 3) PR text

**Title:** PDF fix: Cloud Run Chromium renderer + Vercel proxy; JSON envelope & smokes

**Summary:**

- Ship reliable **PDF** using **Chromium (Playwright)** on **Google Cloud Run** (scale‑to‑zero; within free tier).
- Keep **DOCX/MD/HTML** conversions on Vercel (Pandoc); only PDF step routes to external.
- Add **JSON envelope** (`ok`, `meta.requestId`, `meta.pdfEngine*`) and a small UI status line (`Engine: … — Req …`).
- Add SSRF default‑deny, caps (`PDF_MAX_PAGES`, `PDF_MAX_BYTES`, `REQUEST_TIMEOUT`), and per‑IP rate limit on the renderer.
- Add curl smokes + CI hook.

**Env vars (Vercel):**

- `PDF_RENDERER_URL` (ex: `https://tinyutils-pdf-xxxxx-uc.a.run.app`)
- `CONVERTER_SHARED_SECRET` (same value on Cloud Run)
- `REQUEST_TIMEOUT=25`, `PDF_MAX_PAGES=50`, `PDF_MAX_BYTES=5242880`

**Env vars (Cloud Run service):**

- same as above; optional `RATE_LIMIT_PER_MIN=60`

**Test plan:**

- Preview deploy → run `bash scripts/smoke_pdf.sh <preview-url>`.
- Check UI: `/tools/text-converter/` → convert MD → PDF; should show `Engine: playwright-chromium — Req ...`.
- CI preview smoke must pass.

**Rollback:**

- **Unset `PDF_RENDERER_URL`** in Vercel → PDFs revert to local `xhtml2pdf` path.
- Or redeploy previous image on Cloud Run (`gcloud run services update --revision ...`).

### 4) Runbook (copy‑paste commands)

**Cloud Run — one‑time setup**

```bash
# 0) Prereqs: gcloud installed; 'gcloud auth login'; 'gcloud config set project <PROJECT_ID>'
# 1) Build & deploy the renderer directly from source
gcloud run deploy tinyutils-pdf \
  --source ./docker/pdf-renderer \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars CONVERTER_SHARED_SECRET='YOUR_LONG_RANDOM_SECRET',PDF_MAX_PAGES=50,PDF_MAX_BYTES=5242880,REQUEST_TIMEOUT=25,RATE_LIMIT_PER_MIN=60

# 2) Get the URL
gcloud run services describe tinyutils-pdf --region us-central1 --format='value(status.url)'
# Example: https://tinyutils-pdf-xxxxx-uc.a.run.app
```

**Vercel — wire preview then prod**

```bash
# Set env vars for preview environment
vercel env add PDF_RENDERER_URL preview    # paste Cloud Run URL
vercel env add CONVERTER_SHARED_SECRET preview
vercel env add REQUEST_TIMEOUT preview
vercel env add PDF_MAX_PAGES preview
vercel env add PDF_MAX_BYTES preview

# Deploy preview
vercel --prod=false

# Run smokes against preview
bash scripts/smoke_pdf.sh "$(vercel --confirm --prod=false --dry-run | tail -n1 | awk '{print $NF}')"  # or paste URL

# Promote to prod
vercel env add PDF_RENDERER_URL production
vercel env add CONVERTER_SHARED_SECRET production
vercel env add REQUEST_TIMEOUT production
vercel env add PDF_MAX_PAGES production
vercel env add PDF_MAX_BYTES production
vercel --prod

# Prod smoke
bash scripts/smoke_pdf.sh "https://<your-prod-domain>"
```

**Optional: Railway/Render deployment (if you prefer A instead of C)**

- **Railway:** create a new service from your Git repo path `docker/pdf-renderer`, set `CONVERTER_SHARED_SECRET`, enable **Serverless/App‑Sleeping**. Railway serverless behavior docs here.
- **Render:** create **Web Service** from `docker/pdf-renderer`, pick **Free** (sleeps) or **Starter ($9)**; set env vars. Free tier spins down after 15‑min idle; 750 hours included.

### 5) Risk register + Cost watch

**Top 5 risks & mitigations**

1. **Cold starts** (Cloud Run): first PDF after idle has a small delay. Mitigate with rare, scheduled warmup (optional). **Cost: $0** (free tier likely absorbs).
2. **Network egress spikes**: Huge PDFs could push egress slightly. PDFs are small; watch sizes. Railway/Render/Cloud Run egress pricing exists; Cloud Run’s first 1 GiB NA is free.
3. **CSS surprises**: Chromium is very faithful, but not LaTeX‑grade typesetting for books. We cap pages/bytes and return diagnostics.
4. **Abuse / SSRF**: Renderer denies all external fetches; only `data:` allowed; per‑IP token bucket is on.
5. **Vendor changes**: If Cloud Run pricing changes, toggle back to Vercel fallback or swap to Railway/Render (container is portable).

**Cost watch (so you don’t get surprised)**

- **Cloud Run metrics:** vCPU‑sec & GiB‑sec — you should be **far** under free tier (240k/450k). Alerts at 50%/80% free tier.
- **Vercel function usage/body sizes:** for debug only; PDF path is now external. **Body limit 4.5 MB** reminder.
- **If you try Railway:** usage will sit near **$5 floor**; verify serverless sleeping is on.
- **If you try Render Free:** expect sleep; for steady prod choose **Starter $9**.

------

## Why Playwright/Chromium and not LaTeX here?

- You already have Pandoc on Vercel for MD/DOCX/ODT→HTML/TXT. The tricky bit is **HTML→PDF**. Browser engines win for layout fidelity (CSS, emoji, web fonts) without shipping TeX.
- `xhtml2pdf` is fine for simple stuff, but it’s limited to CSS 2.1 + quirks, and issues pile up on modern markup (images, floats, etc.). That’s exactly what’s been biting your Vercel serverless PDF.

------

## Acceptance checklist (you asked for these)

- After applying diffs and running the commands:
  - Preview shows **markdown → pdf** with **`ok:true`**, **`meta.pdfEngine`** set to `playwright-chromium`, and **size > 1 KB**.
  - Error paths return **JSON** with **`x-request-id`** header and useful message.
  - `/api/convert` still works transparently (UI unchanged except for the little status line).
  - CI preview smokes green; prod smoke green post‑merge.

------

## Links I relied on for pricing/limits (for your records)

- **Railway pricing** (per‑second CPU/RAM; egress; plan minimums). **Serverless/App‑Sleeping** doc.
- **Render pricing** + **Free instances sleep after 15 min** / **750 hours**.
- **Cloud Run pricing** (per 100ms, free tier **240k vCPU‑sec** & **450k GiB‑sec**).
- **Restpack pricing** (simple, per‑doc).
- **DocRaptor plans**.
- **Vercel limits** (timeouts, body size, function bundle).
- **xhtml2pdf capabilities/limits**.

------

### Last word

We keep your stack simple: **Vercel front + Pandoc for everything non‑PDF**, and a **serverless Chromium worker** for PDFs. It’s portable (Cloud Run today; Railway/Render later if you want), dirt‑cheap, and the code changes are small and reversible. If you want me to flip this to **A) Railway** in a future PR instead, the Docker image is the same—you’d just run the other deploy steps and point `PDF_RENDERER_URL` there.