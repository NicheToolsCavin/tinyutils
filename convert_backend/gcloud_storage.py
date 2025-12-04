"""GCS storage helpers (stub) for WS2 LibreOffice pipeline.

Designed to be imported safely even when ``google-cloud-storage`` is
absent. Callers that actually use GCS will see a clear RuntimeError
until the dependency is installed and configured.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Tuple


def _require_storage_client(project: str | None = None):  # pragma: no cover - thin shim
    try:
        from google.cloud import storage  # type: ignore
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "google-cloud-storage is not installed; "
            "add it to requirements before using GCS helpers."
        ) from exc
    return storage.Client(project=project)


def parse_gs_uri(uri: str) -> Tuple[str, str]:
    """Split a ``gs://`` URI into bucket and blob name.

    Raises ValueError for malformed URIs.
    """
    if not uri.startswith("gs://"):
        raise ValueError(f"Expected gs:// URI, got {uri!r}")
    parts = uri[5:].split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(f"Incomplete gs:// URI: {uri!r}")
    return parts[0], parts[1]


@dataclass
class GCSClient:
    """Minimal GCS client wrapper for upload/download.

    This is intentionally small; higher-level pipeline code should own
    naming conventions and lifecycle policies.
    """

    project: str | None = None

    def download(self, uri: str, dest: Path) -> Path:
        bucket_name, blob_name = parse_gs_uri(uri)
        client = _require_storage_client(self.project)
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        dest.parent.mkdir(parents=True, exist_ok=True)
        blob.download_to_filename(dest)
        return dest

    def upload(self, src: Path, uri: str, content_type: str | None = None) -> str:
        bucket_name, blob_name = parse_gs_uri(uri)
        client = _require_storage_client(self.project)
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(src, content_type=content_type)
        return uri

