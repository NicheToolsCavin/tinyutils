"""FastAPI wrapper for PDF Extract API.

Wraps the Vercel-style BaseHTTPRequestHandler as a FastAPI app for Cloud Run.
"""
import io
import os
import zipfile
from typing import List

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from pypdf import PdfReader

MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50MB upload cap
MAX_FILES_LIMIT = 50  # Avoid runaway processing

app = FastAPI(title="PDF Extract API")


@app.post("/")
async def pdf_extract(
    file: UploadFile = File(...),
):
    """Handle PDF text extraction requests."""
    file_bytes = await file.read()

    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        return JSONResponse({"error": "Upload too large (Max 50MB)"}, status_code=400)

    # Prepare output ZIP
    output_io = io.BytesIO()
    output_zip = zipfile.ZipFile(output_io, "w", zipfile.ZIP_DEFLATED)

    processed_count = 0
    error_log: List[str] = []
    is_zip_upload = False

    file_like = io.BytesIO(file_bytes)

    if zipfile.is_zipfile(file_like):
        is_zip_upload = True
        file_like.seek(0)
        try:
            input_zip = zipfile.ZipFile(file_like, "r")
        except zipfile.BadZipFile:
            return JSONResponse({"error": "Invalid ZIP or PDF file"}, status_code=422)

        for file_info in input_zip.infolist():
            if file_info.is_dir():
                continue

            filename = file_info.filename
            _, ext = os.path.splitext(filename)

            if ext.lower() != ".pdf":
                continue

            if processed_count >= MAX_FILES_LIMIT:
                error_log.append(f"Skipped {filename}: limit of {MAX_FILES_LIMIT} files reached.")
                continue

            try:
                with input_zip.open(file_info) as pdf_file:
                    reader = PdfReader(pdf_file)
                    texts: List[str] = []
                    for page in reader.pages:
                        page_text = page.extract_text() or ""
                        texts.append(page_text)

                    full_text = "\n\n".join(texts).strip()
                    txt_filename = os.path.splitext(filename)[0] + ".txt"
                    output_zip.writestr(txt_filename, full_text)
                    processed_count += 1
            except Exception as exc:
                error_log.append(f"Error processing {filename}: {exc}")
    else:
        # Single PDF path
        header = file_bytes[:512].lstrip(b" \t\n\r")[:5]
        if not header.startswith(b"%PDF"):
            return JSONResponse({"error": "Invalid ZIP or PDF file"}, status_code=422)

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
        except Exception as exc:
            error_log.append(f"Error processing uploaded PDF: {exc}")

    # Attach error report if needed
    if error_log:
        output_zip.writestr("_conversion_report.txt", "\n".join(error_log))

    output_zip.close()

    if processed_count == 0 and not error_log:
        if is_zip_upload:
            return JSONResponse({"error": "No PDF files found in ZIP archive"}, status_code=400)
        else:
            return JSONResponse({"error": "Failed to extract text from PDF"}, status_code=422)

    output_io.seek(0)

    return StreamingResponse(
        output_io,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=extracted_text.zip"},
    )
