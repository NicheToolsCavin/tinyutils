"""Bulk PDF text extraction API.

Upload a ZIP archive of PDFs and receive a ZIP archive of .txt files
containing extracted text. Uses pypdf for lightweight, non-OCR text
extraction and includes an optional _conversion_report.txt with any
errors encountered per file.
"""

from http.server import BaseHTTPRequestHandler
import cgi
import io
import json
import os
import zipfile
from typing import List

from pypdf import PdfReader


MAX_ZIP_SIZE_BYTES = 50 * 1024 * 1024  # 50MB upload cap
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

            zip_bytes = uploaded_files[0]
            if len(zip_bytes) > MAX_ZIP_SIZE_BYTES:
                self._send_error(400, "ZIP too large (Max 50MB)")
                return

            # Open source ZIP
            try:
                input_zip = zipfile.ZipFile(io.BytesIO(zip_bytes), "r")
            except zipfile.BadZipFile:
                self._send_error(422, "Invalid ZIP file")
                return

            output_io = io.BytesIO()
            output_zip = zipfile.ZipFile(output_io, "w", zipfile.ZIP_DEFLATED)

            processed_count = 0
            error_log: List[str] = []

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

            # Attach error report if needed
            if error_log:
                output_zip.writestr("_conversion_report.txt", "\n".join(error_log))

            output_zip.close()

            if processed_count == 0 and not error_log:
                self._send_error(400, "No PDF files found in ZIP")
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

