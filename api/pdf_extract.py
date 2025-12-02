"""Bulk PDF text extraction API.

Upload either:
- a ZIP archive of PDFs (bulk mode), or
- a single PDF file.

In both cases the response is a ZIP archive of .txt files containing
extracted text. Uses pypdf for lightweight, non-OCR text extraction and
includes an optional _conversion_report.txt with any errors encountered
per file.
"""

from http.server import BaseHTTPRequestHandler
import cgi
import io
import json
import os
import zipfile
from typing import List

from pypdf import PdfReader


MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50MB upload cap
MAX_FILES_LIMIT = 50  # Avoid runaway processing


class handler(BaseHTTPRequestHandler):  # type: ignore[name-defined]
    def do_POST(self) -> None:  # noqa: N802
        try:
            content_type, pdict = cgi.parse_header(self.headers.get("content-type"))
            if content_type != "multipart/form-data":
                self._send_error(400, "Content-Type must be multipart/form-data")
                return

            boundary = pdict.get("boundary")
            if not boundary:
                self._send_error(400, "Missing multipart boundary")
                return

            pdict["boundary"] = boundary.encode("utf-8")
            form = cgi.parse_multipart(self.rfile, pdict)

            uploaded_files: List[bytes] = form.get("file") or []
            if not uploaded_files:
                self._send_error(400, "No file uploaded")
                return

            file_bytes = uploaded_files[0]
            if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
                self._send_error(400, "Upload too large (Max 50MB)")
                return

            # Decide whether this is a ZIP of PDFs or a single PDF.
            file_like = io.BytesIO(file_bytes)

            # Prepare output ZIP once we know the upload is syntactically valid.
            output_io = io.BytesIO()
            output_zip = zipfile.ZipFile(output_io, "w", zipfile.ZIP_DEFLATED)

            processed_count = 0
            error_log: List[str] = []
            is_zip_upload = False

            if zipfile.is_zipfile(file_like):
                is_zip_upload = True
                # Bulk ZIP-of-PDFs path (existing behavior, preserved).
                file_like.seek(0)
                try:
                    input_zip = zipfile.ZipFile(file_like, "r")
                except zipfile.BadZipFile:
                    # Clearly not a valid ZIP container.
                    self._send_error(422, "Invalid ZIP or PDF file")
                    return

                for file_info in input_zip.infolist():
                    if file_info.is_dir():
                        continue

                    filename = file_info.filename
                    _, ext = os.path.splitext(filename)

                    if ext.lower() != ".pdf":
                        continue

                    if processed_count >= MAX_FILES_LIMIT:
                        error_log.append(
                            f"Skipped {filename}: limit of {MAX_FILES_LIMIT} files reached."
                        )
                        continue

                    try:
                        with input_zip.open(file_info) as pdf_file:
                            reader = PdfReader(pdf_file)
                            texts: List[str] = []
                            for page in reader.pages:
                                # pypdf may return None when no text layer exists
                                page_text = page.extract_text() or ""
                                texts.append(page_text)

                            full_text = "\n\n".join(texts).strip()
                            txt_filename = os.path.splitext(filename)[0] + ".txt"
                            output_zip.writestr(txt_filename, full_text)
                            processed_count += 1
                    except Exception as exc:  # pragma: no cover - highly dependent on PDFs
                        error_log.append(f"Error processing {filename}: {exc}")
            else:
                # Single PDF path: treat the upload as one PDF and return a ZIP
                # containing a single .txt file. This keeps the response shape
                # identical to the bulk ZIP mode.

                # Fast signature check for obviously invalid uploads (e.g. random
                # text or non-PDF blobs). This restores the original contract of
                # returning a 4xx JSON error for clearly bad inputs instead of a
                # 200 ZIP.
                # Note: Only check first 512 bytes to avoid expensive lstrip on large files
                header = file_bytes[:512].lstrip(b" \t\n\r")[:5]
                if not header.startswith(b"%PDF"):
                    self._send_error(422, "Invalid ZIP or PDF file")
                    return

                try:
                    file_like.seek(0)
                    reader = PdfReader(file_like)
                    texts = []
                    for page in reader.pages:
                        page_text = page.extract_text() or ""
                        texts.append(page_text)

                    full_text = "\n\n".join(texts).strip()
                    output_zip.writestr("document.txt", full_text)
                    processed_count = 1
                except Exception as exc:  # pragma: no cover - highly dependent on PDFs
                    error_log.append(f"Error processing uploaded PDF: {exc}")

            # Attach error report if needed
            if error_log:
                output_zip.writestr("_conversion_report.txt", "\n".join(error_log))

            output_zip.close()

            if processed_count == 0 and not error_log:
                if is_zip_upload:
                    self._send_error(400, "No PDF files found in ZIP archive")
                else:
                    self._send_error(422, "Failed to extract text from PDF")
                return

            output_io.seek(0)
            payload = output_io.getvalue()

            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Disposition", "attachment; filename=extracted_text.zip")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)

        except Exception as exc:  # pragma: no cover
            self._send_error(500, f"Server Error: {exc}")

    def _send_error(self, code: int, message: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))
