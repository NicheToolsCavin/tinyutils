"""Stub HTTP service for WS2 LibreOffice conversions.

This module is intentionally minimal and designed for container builds and
local dry-runs. It exposes `/health` and `/convert` but does not yet wire in
Google Cloud Storage or real LibreOffice conversion logic.
"""
from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer


PORT = int(os.getenv("PORT", "8080"))
SOFFICE_BIN = os.getenv("SOFFICE_BIN", "libreoffice")


class Handler(BaseHTTPRequestHandler):
    server_version = "TinyUtilsLibreOfficeStub/0.1"

    def _json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args) -> None:  # pragma: no cover - noise
        # Reduce noise in Cloud Run logs; keep minimal context.
        return

    def do_GET(self) -> None:  # noqa: N802 (http.server signature)
        if self.path == "/health":
            self._json({"status": "ok", "soffice_bin": SOFFICE_BIN})
            return
        self._json({"error": "not_found"}, status=404)

    def do_POST(self) -> None:  # noqa: N802 (http.server signature)
        if self.path != "/convert":
            self._json({"error": "not_found"}, status=404)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length else b"{}"
        try:
            payload = json.loads(raw or "{}")
        except json.JSONDecodeError:
            self._json({"error": "invalid_json"}, status=400)
            return

        input_gcs_uri = payload.get("input_gcs_uri")
        output_gcs_uri = payload.get("output_gcs_uri")
        target_format = payload.get("target_format", "pdf")

        if not input_gcs_uri or not output_gcs_uri:
            self._json(
                {
                    "error": "missing_fields",
                    "required": ["input_gcs_uri", "output_gcs_uri"],
                },
                status=400,
            )
            return

        # Stub response only; conversion wiring will be added later.
        self._json(
            {
                "status": "stub",
                "detail": "LibreOffice conversion pipeline not yet wired to GCS.",
                "request": {
                    "input_gcs_uri": input_gcs_uri,
                    "output_gcs_uri": output_gcs_uri,
                    "target_format": target_format,
                },
            },
            status=202,
        )


def main() -> None:
    server = HTTPServer(("", PORT), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()

