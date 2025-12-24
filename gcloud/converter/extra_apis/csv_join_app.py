"""FastAPI wrapper for CSV Join API.

Wraps the Vercel-style BaseHTTPRequestHandler as a FastAPI app for Cloud Run.
"""
import csv
import io
import sys
from typing import List, Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

# Allow very large CSV fields
csv.field_size_limit(sys.maxsize)

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB per file
CSV_DANGEROUS_PREFIXES = ("=", "+", "-", "@")

app = FastAPI(title="CSV Join API")


def _harden_row(row: List[str]) -> List[str]:
    """Prefix spreadsheet formula-looking cells with a single quote."""
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


@app.post("/")
async def csv_join(
    files: List[UploadFile] = File(...),
    action: str = Form("scan"),
    col_a_idx: Optional[str] = Form(None),
    col_b_idx: Optional[str] = Form(None),
    delim_a: str = Form(","),
    delim_b: str = Form(","),
    join_type: str = Form("inner"),
):
    """Handle CSV join requests."""
    if len(files) < 2:
        return JSONResponse({"error": "Please upload two files."}, status_code=400)

    # Read file contents
    file_contents = []
    for idx, f in enumerate(files[:2]):
        content = await f.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            return JSONResponse(
                {"error": f"File {idx + 1} is too large (max {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB)"},
                status_code=413,
            )
        file_contents.append(content)

    if action == "scan":
        return _handle_scan(file_contents)

    if action == "join":
        try:
            col_a = int(col_a_idx) if col_a_idx else -1
            col_b = int(col_b_idx) if col_b_idx else -1
        except ValueError:
            return JSONResponse({"error": "Join columns must be numeric indices"}, status_code=400)

        if col_a < 0 or col_b < 0:
            return JSONResponse({"error": "Join columns not specified"}, status_code=400)

        return _handle_join(file_contents, col_a, col_b, delim_a, delim_b, join_type)

    return JSONResponse({"error": "Unknown action; expected 'scan' or 'join'"}, status_code=400)


def _handle_scan(files: List[bytes]) -> JSONResponse:
    """Inspect the first two files and return headers + delimiters."""
    headers_data = []
    for i, file_bytes in enumerate(files[:2]):
        try:
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
        except Exception as exc:
            headers_data.append({"id": i, "error": str(exc)})

    return JSONResponse({"status": "success", "files": headers_data})


def _handle_join(
    files: List[bytes],
    col_a_idx: int,
    col_b_idx: int,
    delim_a: str,
    delim_b: str,
    join_type: str,
) -> StreamingResponse:
    """Perform hash join between file A and file B."""
    if join_type not in {"inner", "left"}:
        join_type = "inner"

    # Build hash map from File B
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

    # Stream File A and join
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

    return StreamingResponse(
        iter([output_io.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=joined_result.csv"},
    )
