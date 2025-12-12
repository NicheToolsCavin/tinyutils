"""JSON ↔ CSV converter API.

Modes
- json_to_csv: upload JSON (array / object / JSON Lines) → flattened CSV
- csv_to_json: upload CSV/TSV → JSON array of objects

This endpoint deliberately focuses on data structure rather than
general document conversion. It flattens nested objects and applies
CSV hardening to keep spreadsheet formulas inert.
"""

from http.server import BaseHTTPRequestHandler
import csv
import io
import json
from typing import Any, Dict, List

from api._lib.multipart import MultipartParseError, parse_multipart_form

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB
CSV_DANGEROUS_PREFIXES = ("=", "+", "-", "@")


def flatten_json(obj: Any) -> Dict[str, Any]:
    """Flatten a nested JSON object into a single-depth dict.

    Example: {"a": {"b": 1}} -> {"a.b": 1}
    Arrays are joined with a pipe (`|`) to keep rows 1:1.
    """

    out: Dict[str, Any] = {}

    def _flatten(value: Any, prefix: str = "") -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                _flatten(child, f"{prefix}{key}.")
        elif isinstance(value, list):
            # Represent arrays as pipe-joined values; this avoids
            # exploding rows or losing data while remaining CSV-friendly.
            out[prefix[:-1]] = "|".join(str(item) for item in value)
        else:
            out[prefix[:-1]] = value

    _flatten(obj)
    return out


def _harden_cell(value: Any) -> str:
    if value is None:
        s = ""
    else:
        s = str(value)
    if s and s[0] in CSV_DANGEROUS_PREFIXES:
        s = "'" + s
    return s


class handler(BaseHTTPRequestHandler):  # type: ignore[name-defined]
    def do_POST(self) -> None:  # noqa: N802
        try:
            try:
                # Allow small overhead above file cap for multipart boundaries + form fields.
                form = parse_multipart_form(
                    self.headers,
                    self.rfile,
                    max_body_bytes=MAX_FILE_SIZE_BYTES + (5 * 1024 * 1024),
                )
            except MultipartParseError as exc:
                self._send_error(exc.status, str(exc))
                return

            mode = (form.get("mode") or ["json_to_csv"])[0]
            if not isinstance(mode, str):
                mode = "json_to_csv"
            files = form.get("file") or []
            if not files:
                self._send_error(400, "No file uploaded")
                return

            file_bytes = files[0]
            if len(file_bytes) > MAX_FILE_SIZE_BYTES:
                self._send_error(400, "File too large (Max 50MB)")
                return

            if mode == "json_to_csv":
                self._handle_json_to_csv(file_bytes)
            elif mode == "csv_to_json":
                self._handle_csv_to_json(file_bytes)
            else:
                self._send_error(400, "Unknown mode; expected 'json_to_csv' or 'csv_to_json'")

        except Exception as exc:  # pragma: no cover
            self._send_error(500, f"Server Error: {exc}")

    # --- Modes -----------------------------------------------------------

    def _handle_json_to_csv(self, file_bytes: bytes) -> None:
        try:
            text_data = file_bytes.decode("utf-8")

            # Try JSON array / object first
            try:
                data = json.loads(text_data)
                if not isinstance(data, list):
                    data = [data]
            except json.JSONDecodeError:
                # Fallback: JSON Lines / NDJSON
                data = []
                for line in text_data.splitlines():
                    if line.strip():
                        data.append(json.loads(line))

            if not data:
                self._send_error(400, "Valid JSON not found")
                return

            flattened = [flatten_json(item) for item in data]

            # Collect union of keys across all records
            headers_set = set()
            for item in flattened:
                headers_set.update(item.keys())
            headers: List[str] = sorted(headers_set)

            out = io.StringIO()
            writer = csv.writer(out)

            # Hardened header row
            writer.writerow([_harden_cell(h) for h in headers])

            for item in flattened:
                row = [_harden_cell(item.get(h, "")) for h in headers]
                writer.writerow(row)

            out.seek(0)
            payload = out.getvalue().encode("utf-8")
            self._send_file(payload, "converted.csv", "text/csv; charset=utf-8")

        except Exception as exc:
            self._send_error(400, f"JSON Parse Error: {exc}")

    def _handle_csv_to_json(self, file_bytes: bytes) -> None:
        try:
            text_data = file_bytes.decode("utf-8")
            f_io = io.StringIO(text_data)

            # Auto-detect delimiter from sample
            try:
                dialect = csv.Sniffer().sniff(text_data[:4096])
                delimiter = dialect.delimiter
            except Exception:
                delimiter = ","

            reader = csv.DictReader(f_io, delimiter=delimiter)
            data = list(reader)

            output_json = json.dumps(data, indent=2)
            self._send_file(output_json.encode("utf-8"), "converted.json", "application/json; charset=utf-8")

        except Exception as exc:
            self._send_error(400, f"CSV Parse Error: {exc}")

    # --- Helpers ---------------------------------------------------------

    def _send_file(self, content: bytes, filename: str, content_type: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Disposition", f"attachment; filename={filename}")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def _send_error(self, code: int, message: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))
