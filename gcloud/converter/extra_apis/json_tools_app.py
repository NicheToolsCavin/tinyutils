"""FastAPI wrapper for JSON Tools API.

Wraps the Vercel-style BaseHTTPRequestHandler as a FastAPI app for Cloud Run.
"""
import csv
import io
import json
from typing import Any, Dict, List

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB
CSV_DANGEROUS_PREFIXES = ("=", "+", "-", "@")

app = FastAPI(title="JSON Tools API")


def flatten_json(obj: Any) -> Dict[str, Any]:
    """Flatten a nested JSON object into a single-depth dict."""
    out: Dict[str, Any] = {}

    def _flatten(value: Any, prefix: str = "") -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                _flatten(child, f"{prefix}{key}.")
        elif isinstance(value, list):
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


@app.post("/")
async def json_tools(
    file: UploadFile = File(...),
    mode: str = Form("json_to_csv"),
):
    """Handle JSON/CSV conversion requests."""
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        return JSONResponse({"error": "File too large (Max 50MB)"}, status_code=400)

    try:
        if mode == "json_to_csv":
            return _handle_json_to_csv(file_bytes)
        elif mode == "csv_to_json":
            return _handle_csv_to_json(file_bytes)
        else:
            return JSONResponse(
                {"error": "Unknown mode; expected 'json_to_csv' or 'csv_to_json'"},
                status_code=400,
            )
    except Exception as exc:
        return JSONResponse({"error": f"Server Error: {exc}"}, status_code=500)


def _handle_json_to_csv(file_bytes: bytes) -> StreamingResponse:
    """Convert JSON to CSV."""
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
            return JSONResponse({"error": "Valid JSON not found"}, status_code=400)

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

        return StreamingResponse(
            iter([out.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=converted.csv"},
        )

    except Exception as exc:
        return JSONResponse({"error": f"JSON Parse Error: {exc}"}, status_code=400)


def _handle_csv_to_json(file_bytes: bytes) -> StreamingResponse:
    """Convert CSV to JSON."""
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

        return StreamingResponse(
            iter([output_json]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=converted.json"},
        )

    except Exception as exc:
        return JSONResponse({"error": f"CSV Parse Error: {exc}"}, status_code=400)
