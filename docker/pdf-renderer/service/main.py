from __future__ import annotations
import base64, os, time, uuid
from typing import Optional
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field
from pypdf import PdfReader
from playwright.async_api import async_playwright
import asyncio

SHARED = os.getenv("CONVERTER_SHARED_SECRET","")
PDF_MAX_PAGES=int(os.getenv("PDF_MAX_PAGES","50"))
PDF_MAX_BYTES=int(os.getenv("PDF_MAX_BYTES","5242880"))  # 5 MiB
REQUEST_TIMEOUT=float(os.getenv("REQUEST_TIMEOUT","25"))
RATE_LIMIT_PER_MIN=int(os.getenv("RATE_LIMIT_PER_MIN","60"))

app = FastAPI()
_rate = {}  # naive in-mem token bucket: ip -> (tokens, ts)
ENGINE="playwright-chromium"
ENGINE_VERSION=None

class ConvertIn(BaseModel):
    html: str
    requestId: Optional[str]=None
    name: str = "output.pdf"

class Output(BaseModel):
    name: str
    size: int
    target: str = "pdf"
    dataBase64: str

class ConvertOut(BaseModel):
    ok: bool = True
    meta: dict
    outputs: list[Output]

def _rate_check(ip: str):
    import time
    now=int(time.time())
    tokens, ts=_rate.get(ip,(RATE_LIMIT_PER_MIN, now))
    if now>ts:  # refill every second
        tokens=min(RATE_LIMIT_PER_MIN, tokens + (now-ts)*RATE_LIMIT_PER_MIN//60)
        ts=now
    if tokens<=0:
        _rate[ip]=(tokens, ts)
        raise HTTPException(status_code=429, detail="rate_limited")
    _rate[ip]=(tokens-1, ts)

@app.get("/healthz")
async def healthz():
    return {"ok": True, "engine": ENGINE, "version": ENGINE_VERSION}

@app.on_event("startup")
async def init():
    global ENGINE_VERSION
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ENGINE_VERSION = (await browser.version())
        await browser.close()

@app.post("/convert", response_model=ConvertOut)
async def convert(req: Request, payload: ConvertIn,
                  shared: Optional[str]=Header(default=None, alias="x-shared-secret"),
                  xff: Optional[str]=Header(default=None, alias="x-forwarded-for"),
                  rid: Optional[str]=Header(default=None, alias="x-request-id")):
    if not SHARED or shared != SHARED:
        raise HTTPException(status_code=401, detail="unauthorized")
    client_ip = (xff.split(",")[0].strip() if xff else req.client.host)
    _rate_check(client_ip)
    request_id = payload.requestId or rid or uuid.uuid4().hex
    html = payload.html or ""
    if len(html.encode("utf-8")) > 2_000_000:
        raise HTTPException(status_code=413, detail="input_too_large")
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # SSRF guard: block all external fetches
        async def gate(route):
            url = route.request.url
            if url.startswith("data:") or url.startswith("about:"):
                await route.continue_()
            else:
                await route.abort()
        await page.route("**/*", gate)
        try:
            await page.set_content(html, wait_until="load", timeout=REQUEST_TIMEOUT*1000)
            pdf_bytes = await page.pdf(format="A4", print_background=True)
        except Exception:
            await browser.close()
            raise HTTPException(status_code=400, detail="render_failed")
        await browser.close()
    if len(pdf_bytes) > PDF_MAX_BYTES:
        raise HTTPException(status_code=413, detail="pdf_too_large")
    try:
        n_pages = len(PdfReader(stream=pdf_bytes).pages)
        if n_pages > PDF_MAX_PAGES:
            raise HTTPException(status_code=413, detail="pdf_too_many_pages")
    except HTTPException:
        raise
    except Exception:
        pass
    b64 = base64.b64encode(pdf_bytes).decode("ascii")
    meta = {"requestId": request_id, "pdfEngine": ENGINE,
            "pdfEngineVersion": ENGINE_VERSION, "pdfExternalAvailable": True}
    return ConvertOut(ok=True, meta=meta,
                      outputs=[Output(name=payload.name, size=len(pdf_bytes), dataBase64=b64)])
