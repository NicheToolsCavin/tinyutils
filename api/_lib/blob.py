"""Helpers for downloading inputs and uploading outputs."""
from __future__ import annotations

import base64
import json
import logging
import os
import re
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlparse

import requests

DEFAULT_TIMEOUT = float(os.getenv("BLOB_DOWNLOAD_TIMEOUT", "30"))
USER_AGENT = os.getenv("TINYUTILS_BLOB_UA", "tinyutils-backend/0.1")
BLOB_UPLOAD_URL = os.getenv("VERCEL_BLOB_API_URL", "https://api.vercel.com/v2/blob/upload")

logger = logging.getLogger(__name__)


class DownloadError(Exception):
    """Raised when an input cannot be retrieved."""


def _decode_data_url(url: str) -> Tuple[bytes, Optional[str]]:
    match = re.match(r"data:([^;,]*)(;base64)?,(.*)", url, re.IGNORECASE)
    if not match:
        raise DownloadError("Malformed data URL")
    mime_type, base64_flag, payload = match.groups()
    mime_type = mime_type or "application/octet-stream"
    if base64_flag:
        data = base64.b64decode(payload)
    else:
        data = requests.utils.unquote_to_bytes(payload)
    return data, mime_type


def download_to_path(url: str, destination: Path) -> Tuple[int, Optional[str]]:
    """Download *url* into *destination* and return (size_bytes, content_type)."""

    parsed = urlparse(url)
    if parsed.scheme == "data":
        data, mime_type = _decode_data_url(url)
        destination.write_bytes(data)
        return len(data), mime_type

    if parsed.scheme not in {"http", "https"}:
        raise DownloadError(f"Unsupported URL scheme: {parsed.scheme or 'unknown'}")

    headers = {"User-Agent": USER_AGENT}
    response = requests.get(url, timeout=DEFAULT_TIMEOUT, stream=True, headers=headers)
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:  # pragma: no cover - thin wrapper
        raise DownloadError(str(exc)) from exc

    content_type = response.headers.get("Content-Type")
    with destination.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=1024 * 256):
            if chunk:
                handle.write(chunk)
    size = destination.stat().st_size
    return size, content_type


def upload_bytes(name: str, data: bytes, content_type: str) -> str:
    """Upload bytes to blob storage or fall back to a data URL."""

    token = os.getenv("BLOB_READ_WRITE_TOKEN")
    if token:
        token = token.strip()  # Remove trailing newlines from environment variable
        try:
            blob_url = _upload_to_vercel_blob(name, data, content_type, token)
            if blob_url:
                return blob_url
        except requests.RequestException as exc:  # pragma: no cover - fall back
            logger.warning("blob upload failed: %s", exc)
        except ValueError as exc:  # pragma: no cover - invalid response
            logger.warning("blob upload returned invalid payload: %s", exc)

    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def _upload_to_vercel_blob(
    name: str,
    data: bytes,
    content_type: str,
    token: str,
) -> Optional[str]:
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": USER_AGENT,
    }
    files = {"file": (name, data, content_type)}
    response = requests.post(
        BLOB_UPLOAD_URL,
        headers=headers,
        files=files,
        timeout=DEFAULT_TIMEOUT,
    )
    response.raise_for_status()
    try:
        payload = response.json()
    except json.JSONDecodeError as exc:  # pragma: no cover - unexpected
        raise ValueError("Blob API returned non-JSON payload") from exc

    return (
        payload.get("url")
        or payload.get("blob", {}).get("url")
        or payload.get("pathname")
    )
