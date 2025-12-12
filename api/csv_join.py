"""CSV Joiner API

Join two CSV/TSV files on a common column using a hash join.

Actions
- scan: inspect the first two uploaded files and return headers + detected delimiters
- join: perform an inner or left join and return a hardened CSV download

This endpoint is designed similarly to api/bulk-replace.py: simple
multipart/form-data interface, size caps, and CSV hardening so opening
results in Excel/Sheets does not execute formulas.
"""

from http.server import BaseHTTPRequestHandler
import csv
import io
import json
import sys
from typing import List

from api._lib.multipart import MultipartParseError, parse_multipart_form

# Allow very large CSV fields (long text blobs)
csv.field_size_limit(sys.maxsize)

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB per file
CSV_DANGEROUS_PREFIXES = ("=", "+", "-", "@")


def _harden_row(row: List[str]) -> List[str]:
    """Prefix spreadsheet formula-looking cells with a single quote.

    This mirrors the existing CSV hardening elsewhere in the repo so
    opening the exported CSV in Excel/Sheets does not execute formulas.
    """

    safe: List[str] = []
    for cell in row:
        if cell is None:
            cell_str = ""
        else:
            cell_str = str(cell)

        if cell_str and cell_str[0] in CSV_DANGEROUS_PREFIXES:
            cell_str = "'" + cell_str
        safe.append(cell_str)
    return safe


class handler(BaseHTTPRequestHandler):  # type: ignore[name-defined]
    def do_POST(self) -> None:  # noqa: N802 (BaseHTTPRequestHandler API)
        try:
            try:
                form = parse_multipart_form(
                    self.headers,
                    self.rfile,
                    max_body_bytes=(2 * MAX_FILE_SIZE_BYTES) + (10 * 1024 * 1024),
                )
            except MultipartParseError as exc:
                self._send_error(exc.status, str(exc))
                return

            action = form.get("action", ["scan"])[0]
            files = form.get("files") or []

            if len(files) < 2:
                self._send_error(400, "Please upload two files.")
                return

            # Enforce per-file size limit
            for idx, f in enumerate(files[:2]):
                if len(f) > MAX_FILE_SIZE_BYTES:
                    self._send_error(
                        413,
                        f"File {idx + 1} is too large (max {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB)",
                    )
                    return

            if action == "scan":
                self._handle_scan(files)
                return

            if action == "join":
                self._handle_join(files, form)
                return

            self._send_error(400, "Unknown action; expected 'scan' or 'join'")

        except Exception as exc:  # pragma: no cover - defensive
            self._send_error(500, f"Server Error: {exc}")

    # --- Actions ---------------------------------------------------------

    def _handle_scan(self, files: List[bytes]) -> None:
        """Inspect the first two files and return headers + delimiters."""

        headers_data = []
        for i, file_bytes in enumerate(files[:2]):
            try:
                # Decode a small sample for delimiter + header detection
                sample = file_bytes[:4096].decode("utf-8", errors="ignore")
                sniffer = csv.Sniffer()
                try:
                    dialect = sniffer.sniff(sample)
                    delimiter = dialect.delimiter
                except Exception:
                    delimiter = ","

                f_io = io.StringIO(sample)
                reader = csv.reader(f_io, delimiter=delimiter)
                headers = next(reader, [])

                headers_data.append({
                    "id": i,
                    "delimiter": delimiter,
                    "headers": headers,
                })
            except Exception as exc:  # pragma: no cover - extremely defensive
                headers_data.append({"id": i, "error": str(exc)})

        self._send_json({"status": "success", "files": headers_data})

    def _handle_join(self, files: List[bytes], form: dict) -> None:
        """Perform hash join between file A and file B."""

        try:
            col_a_idx = int(form.get("col_a_idx", ["-1"])[0])
            col_b_idx = int(form.get("col_b_idx", ["-1"])[0])
        except ValueError:
            self._send_error(400, "Join columns must be numeric indices")
            return

        if col_a_idx < 0 or col_b_idx < 0:
            self._send_error(400, "Join columns not specified")
            return

        delim_a = (form.get("delim_a", [","])[0] or ",")
        delim_b = (form.get("delim_b", [","])[0] or ",")
        join_type = (form.get("join_type", ["inner"])[0] or "inner").lower()
        if join_type not in {"inner", "left"}:
            join_type = "inner"

        # --- Build hash map from File B ---
        file_b_str = files[1].decode("utf-8", errors="replace")
        reader_b = csv.reader(io.StringIO(file_b_str), delimiter=delim_b)
        header_b = next(reader_b, [])

        b_map: dict[str, List[List[str]]] = {}
        for row in reader_b:
            if len(row) <= col_b_idx:
                continue
            key = row[col_b_idx].strip()
            if key not in b_map:
                b_map[key] = []
            b_map[key].append(row)

        # --- Stream File A and join ---
        file_a_str = files[0].decode("utf-8", errors="replace")
        reader_a = csv.reader(io.StringIO(file_a_str), delimiter=delim_a)
        header_a = next(reader_a, [])

        output_io = io.StringIO()
        writer = csv.writer(output_io)

        # Write hardened header
        writer.writerow(_harden_row(list(header_a) + list(header_b)))

        for row_a in reader_a:
            if len(row_a) <= col_a_idx:
                continue
            key = row_a[col_a_idx].strip()
            matches = b_map.get(key, [])

            if matches:
                for row_b in matches:
                    writer.writerow(_harden_row(list(row_a) + list(row_b)))
            elif join_type == "left":
                writer.writerow(_harden_row(list(row_a) + [""] * len(header_b)))

        output_io.seek(0)
        payload = output_io.getvalue().encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", "attachment; filename=joined_result.csv")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    # --- Helpers ---------------------------------------------------------

    def _send_json(self, data: dict) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _send_error(self, code: int, message: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))
