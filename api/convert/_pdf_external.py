from __future__ import annotations
import base64, os, requests, uuid
from typing import Tuple, Dict

URL = os.getenv("PDF_RENDERER_URL","").rstrip("/")
SECRET = os.getenv("CONVERTER_SHARED_SECRET","")
TIMEOUT = float(os.getenv("REQUEST_TIMEOUT","25"))

class RemotePdfError(Exception):
    def __init__(self, code: str, message: str):
        self.code, self.message = code, message
        super().__init__(f"{code}: {message}")

def render_html_to_pdf_via_external(html: str, name: str, request_id: str) -> Tuple[bytes, Dict]:
    if not URL:
        raise RemotePdfError("external_unavailable", "PDF_RENDERER_URL not set")
    headers = {
        "content-type": "application/json",
        "x-shared-secret": SECRET or "",
        "x-request-id": request_id or uuid.uuid4().hex,
    }
    resp = requests.post(f"{URL}/convert", json={"html": html, "name": name, "requestId": request_id}, headers=headers, timeout=TIMEOUT)
    if resp.status_code >= 400:
        try:
            data = resp.json()
            raise RemotePdfError(data.get("detail","remote_error"), f"HTTP {resp.status_code}")
        except Exception:
            raise RemotePdfError("remote_http_error", f"HTTP {resp.status_code}")
    data = resp.json()
    if not data.get("ok"):
        raise RemotePdfError(data.get("code","remote_error"), data.get("message","unknown"))
    out = data["outputs"][0]
    pdf_b64 = out.get("dataBase64")
    if not pdf_b64:
        raise RemotePdfError("missing_payload", "no dataBase64")
    return base64.b64decode(pdf_b64), data.get("meta", {})
