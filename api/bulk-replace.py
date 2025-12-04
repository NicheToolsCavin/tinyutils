"""
Bulk Find & Replace API - Multi-file search and replace with visual diffs

Accepts ZIP uploads, applies text/regex replacements, returns preview or download.
Security: Zip bomb protection, path traversal checks, ReDoS timeouts.
"""
import json
import zipfile
import io
import re
import difflib
import os
import time
import uuid
import signal
import contextlib
import traceback
from urllib.parse import parse_qs

try:
    import chardet
    CHARDET_AVAILABLE = True
except ImportError:
    CHARDET_AVAILABLE = False

# --- Configuration ---
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB
MAX_FILES_COUNT = 500
MAX_COMPRESSION_RATIO = 10  # Zip bomb protection
REGEX_TIMEOUT_SECONDS = 5  # ReDoS protection

ALLOWED_TEXT_EXTENSIONS = {
    '.txt', '.md', '.markdown', '.html', '.htm', '.css', '.js', '.jsx',
    '.ts', '.tsx', '.json', '.csv', '.xml', '.py', '.rb', '.php', '.java',
    '.c', '.cpp', '.h', '.hpp', '.sql', '.yaml', '.yml', '.ini', '.env',
    '.svelte', '.vue', '.toml', '.go', '.rs', '.rust', '.swift', '.kt',
    '.sh', '.bash', '.zsh', '.fish', '.r', '.scala', '.clj', '.ex', '.exs'
}

# --- Helpers ---

def is_likely_binary(data_bytes):
    """Detect binary files by checking for null bytes."""
    if not data_bytes:
        return False
    sample = data_bytes[:1024] if len(data_bytes) > 1024 else data_bytes
    return b'\0' in sample

def is_safe_path(path):
    """Reject absolute paths and parent directory references."""
    if os.path.isabs(path):
        return False
    parts = path.split(os.sep)
    return '..' not in parts

def detect_and_decode(raw_bytes):
    """Auto-detect encoding and decode safely."""
    if not raw_bytes:
        return '', 'utf-8'

    # Try UTF-8 first (most common)
    try:
        return raw_bytes.decode('utf-8'), 'utf-8'
    except UnicodeDecodeError:
        pass

    # Use chardet if available
    if CHARDET_AVAILABLE:
        detection = chardet.detect(raw_bytes)
        encoding = detection.get('encoding', 'latin-1')
        confidence = detection.get('confidence', 0)

        if confidence < 0.7:
            # Low confidence, try common encodings
            for enc in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    return raw_bytes.decode(enc), enc
                except:
                    continue

        try:
            return raw_bytes.decode(encoding, errors='replace'), encoding
        except:
            pass

    # Fallback to latin-1 (accepts all bytes)
    return raw_bytes.decode('latin-1', errors='replace'), 'latin-1'

@contextlib.contextmanager
def timeout_context(seconds):
    """Context manager for regex operation timeout."""
    def timeout_handler(signum, frame):
        raise TimeoutError("Operation timed out")

    # Save old handler
    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)

def parse_multipart_form(body, content_type):
    """Parse multipart/form-data manually."""
    import email
    from email import message_from_bytes

    # Add Content-Type header to body for email parser
    headers = f"Content-Type: {content_type}\r\n\r\n".encode()
    msg = message_from_bytes(headers + body)

    form_data = {}
    file_data = None

    if msg.is_multipart():
        for part in msg.walk():
            content_disposition = part.get('Content-Disposition', '')
            if 'name=' in content_disposition:
                # Extract field name
                name = None
                for item in content_disposition.split(';'):
                    item = item.strip()
                    if item.startswith('name='):
                        name = item.split('=', 1)[1].strip('"')
                        break

                if name:
                    payload = part.get_payload(decode=True)
                    if 'filename=' in content_disposition:
                        # This is the file
                        file_data = payload
                        form_data['file'] = payload
                    else:
                        # Regular form field
                        form_data[name] = payload.decode('utf-8') if payload else ''

    return form_data

def send_json_response(status_code, data, request_id):
    """Return JSON response in Vercel format."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'X-Request-ID': request_id,
            'Cache-Control': 'no-store'
        },
        'body': json.dumps(data)
    }

def send_error(code, message, request_id):
    """Send TinyUtils-standard error response."""
    response = {
        "ok": False,
        "message": message,
        "code": code,
        "requestId": request_id
    }
    return send_json_response(code, response, request_id)

def send_success(data, request_id, processing_time_ms):
    """Send TinyUtils-standard success response."""
    response = {
        "ok": True,
        "data": data,
        "meta": {
            "runTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "requestId": request_id,
            "processingTimeMs": processing_time_ms,
            "mode": "bulk-replace",
            "chardetAvailable": CHARDET_AVAILABLE
        }
    }
    return send_json_response(200, response, request_id)

# --- Main Handler ---

def handler(event, context):
    """Modern Vercel Python serverless function handler."""
    request_id = str(uuid.uuid4())
    start_time = time.time()

    try:
        # Parse request
        http_method = event.get('httpMethod') or event.get('method', 'GET')

        if http_method != 'POST':
            return send_error(405, "Method not allowed", request_id)

        # Get request body
        body = event.get('body', b'')
        if isinstance(body, str):
            body = body.encode('utf-8')

        # Get content type
        headers = event.get('headers', {})
        content_type = headers.get('content-type') or headers.get('Content-Type', '')

        if 'multipart/form-data' not in content_type:
            return send_error(400, "Content-Type must be multipart/form-data", request_id)

        # Parse form data
        form = parse_multipart_form(body, content_type)

        # Extract parameters
        mode = form.get('mode', 'simple')
        find_raw = form.get('find', '')
        replace_raw = form.get('replace', '')
        action = form.get('action', 'preview')
        is_case_sensitive = form.get('case_sensitive', 'false') == 'true'

        file_bytes = form.get('file')
        if not file_bytes:
            return send_error(400, "No file uploaded", request_id)

        # Size validation
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            max_mb = MAX_FILE_SIZE_BYTES / 1024 / 1024
            return send_error(413, f"File too large (max {max_mb:.0f}MB)", request_id)

        # Open ZIP and check for zip bomb
        try:
            input_zip = zipfile.ZipFile(io.BytesIO(file_bytes), 'r')
        except zipfile.BadZipFile:
            return send_error(422, "Invalid ZIP file", request_id)

        total_uncompressed = sum(f.file_size for f in input_zip.infolist() if not f.is_dir())
        if total_uncompressed > len(file_bytes) * MAX_COMPRESSION_RATIO:
            return send_error(422, "Suspicious ZIP file (compression ratio too high)", request_id)

        # Prepare regex logic
        regex_flags = re.MULTILINE
        if not is_case_sensitive:
            regex_flags |= re.IGNORECASE

        if mode == 'regex':
            find_pattern = find_raw
        else:
            # Simple mode: escape special chars for literal matching
            find_pattern = re.escape(find_raw)

        if not find_pattern:
            return send_error(400, "Search pattern cannot be empty", request_id)

        # Validate regex syntax
        try:
            re.compile(find_pattern, regex_flags)
        except re.error as e:
            return send_error(422, f"Invalid regex pattern: {str(e)}", request_id)

        # Process ZIP
        output_io = io.BytesIO()
        output_zip = zipfile.ZipFile(output_io, 'w', zipfile.ZIP_DEFLATED)

        diff_results = []
        stats = {
            "filesScanned": 0,
            "filesModified": 0,
            "filesSkipped": 0,
            "totalReplacements": 0,
            "encodingIssues": [],
            "skippedFiles": []
        }

        for file_info in input_zip.infolist():
            if file_info.is_dir():
                continue

            # Path traversal check
            if not is_safe_path(file_info.filename):
                stats["skippedFiles"].append(f"{file_info.filename}: unsafe path")
                continue

            raw_data = input_zip.read(file_info)
            _, ext = os.path.splitext(file_info.filename)

            # Binary safety check
            if ext.lower() not in ALLOWED_TEXT_EXTENSIONS or is_likely_binary(raw_data):
                output_zip.writestr(file_info, raw_data)
                stats["skippedFiles"].append(f"{file_info.filename}: binary file")
                continue

            # Decode with encoding detection
            original_text, detected_encoding = detect_and_decode(raw_data)
            if detected_encoding != 'utf-8':
                stats["encodingIssues"].append(f"{file_info.filename}: {detected_encoding}")

            # Apply replacement with timeout
            try:
                with timeout_context(REGEX_TIMEOUT_SECONDS):
                    # Count matches before replacement
                    matches = list(re.finditer(find_pattern, original_text, flags=regex_flags))
                    match_count = len(matches)

                    # Apply replacement
                    new_text = re.sub(find_pattern, replace_raw, original_text, flags=regex_flags)
            except TimeoutError:
                return send_error(422, "Regex too complex (timeout after 5 seconds). Try a simpler pattern.", request_id)
            except re.error as e:
                return send_error(422, f"Regex error: {str(e)}", request_id)

            # Calculate changes
            is_changed = new_text != original_text
            stats["filesScanned"] += 1

            if is_changed:
                stats["filesModified"] += 1
                stats["totalReplacements"] += match_count

            if action == 'preview':
                if is_changed:
                    diff = difflib.unified_diff(
                        original_text.splitlines(),
                        new_text.splitlines(),
                        fromfile=file_info.filename,
                        tofile=file_info.filename,
                        n=2,
                        lineterm=''
                    )
                    diff_results.append({
                        'filename': file_info.filename,
                        'diff': '\n'.join(list(diff)),
                        'matchCount': match_count
                    })

            elif action == 'download':
                output_zip.writestr(file_info.filename, new_text.encode('utf-8'))

            if stats["filesScanned"] >= MAX_FILES_COUNT:
                break

        output_zip.close()
        input_zip.close()

        # Response
        processing_time_ms = int((time.time() - start_time) * 1000)

        if action == 'download':
            output_io.seek(0)
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': 'attachment; filename="tinyutils_processed.zip"',
                    'X-Request-ID': request_id
                },
                'body': output_io.getvalue(),
                'isBase64Encoded': True
            }
        else:
            return send_success({
                "diffs": diff_results,
                "stats": stats
            }, request_id, processing_time_ms)

    except Exception as e:
        traceback.print_exc()
        return send_error(500, f"Server error: {str(e)}", request_id)
