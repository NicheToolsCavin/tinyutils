"""Minimal multipart/form-data parser.

Python 3.13 removed the stdlib `cgi` module, but several TinyUtils Python
endpoints rely on parsing multipart uploads (files + small form fields).

This helper uses the stdlib `email` package to parse a multipart payload into
`{field_name: [values...]}` where values are:
  - `bytes` for file parts (when a filename is present)
  - `str` for normal form fields
"""

from __future__ import annotations

from email.parser import BytesParser
from email.policy import default
from typing import BinaryIO, Dict, List, Mapping, Union


FormValue = Union[str, bytes]
FormData = Dict[str, List[FormValue]]


class MultipartParseError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def parse_multipart_form(
    headers: Mapping[str, str],
    rfile: BinaryIO,
    *,
    max_body_bytes: int | None = None,
) -> FormData:
    """Parse multipart/form-data from a BaseHTTPRequestHandler-like request.

    Args:
        headers: An object supporting `get(name)` for HTTP headers (e.g. `self.headers`).
        rfile: A binary stream supporting `.read(n)`.
        max_body_bytes: Optional total request body cap.
    """

    content_type = headers.get("content-type")
    if not content_type:
        raise MultipartParseError("Missing Content-Type header", status=400)

    media_type = content_type.split(";", 1)[0].strip().lower()
    if media_type != "multipart/form-data":
        raise MultipartParseError("Content-Type must be multipart/form-data", status=400)

    if "boundary=" not in content_type.lower():
        raise MultipartParseError("Missing multipart boundary", status=400)

    content_length_raw = headers.get("content-length")
    try:
        content_length = int(content_length_raw or "0")
    except ValueError as exc:
        raise MultipartParseError("Invalid Content-Length header", status=400) from exc

    if content_length <= 0:
        raise MultipartParseError("Missing Content-Length header", status=411)

    if max_body_bytes is not None and content_length > max_body_bytes:
        raise MultipartParseError("Upload too large", status=413)

    body = rfile.read(content_length)
    if len(body) != content_length:
        raise MultipartParseError("Incomplete request body", status=400)

    # The email parser expects a full MIME message; prepend headers then body.
    mime_bytes = (
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8")
        + body
    )
    try:
        msg = BytesParser(policy=default).parsebytes(mime_bytes)
    except Exception as exc:
        raise MultipartParseError("Invalid multipart/form-data payload", status=400) from exc
    if not msg.is_multipart():
        raise MultipartParseError("Invalid multipart/form-data payload", status=400)

    out: FormData = {}
    for part in msg.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if not name:
            continue

        payload = part.get_payload(decode=True) or b""
        if part.get_filename() is not None:
            out.setdefault(name, []).append(payload)
            continue

        charset = part.get_content_charset() or "utf-8"
        try:
            text = payload.decode(charset, errors="replace")
        except LookupError:
            text = payload.decode("utf-8", errors="replace")
        out.setdefault(name, []).append(text.rstrip("\r\n"))

    return out
