"""Shared utility helpers for TinyUtils Python backends."""
from __future__ import annotations

import json
import logging
import os
import tempfile
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterator, List, Optional

DEFAULT_MAX_FILE_MB = 100
DEFAULT_MAX_BATCH_MB = 1024
DEFAULT_PREVIEW_HEADINGS = 8
DEFAULT_PREVIEW_SNIPPETS = 4
DEFAULT_DIFF_TRUNCATE_KB = 256

MAX_FILE_MB = int(os.getenv("MAX_FILE_MB", str(DEFAULT_MAX_FILE_MB)))
MAX_BATCH_MB = int(os.getenv("MAX_BATCH_MB", str(DEFAULT_MAX_BATCH_MB)))
PREVIEW_HEADINGS_N = int(
    os.getenv("PREVIEW_HEADINGS_N", str(DEFAULT_PREVIEW_HEADINGS))
)
PREVIEW_SNIPPETS_M = int(
    os.getenv("PREVIEW_SNIPPETS_M", str(DEFAULT_PREVIEW_SNIPPETS))
)
DIFF_TRUNCATE_KB = int(
    os.getenv("DIFF_TRUNCATE_KB", str(DEFAULT_DIFF_TRUNCATE_KB))
)

LOGGER_NAME = "tinyutils.python"


class JobTooLargeError(Exception):
    """Raised when a file or batch exceeds configured limits."""


@dataclass
class DownloadMetadata:
    path: Path
    size_bytes: int
    content_type: Optional[str]
    original_name: str


class ListLogHandler(logging.Handler):
    """In-memory log collector so responses can include log lines."""

    def __init__(self, level: int = logging.INFO) -> None:
        super().__init__(level)
        self._records: List[str] = []

    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover - passthrough
        self._records.append(self.format(record))

    def export(self) -> List[str]:
        return list(self._records)


def get_logger(name: str = LOGGER_NAME) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger


def generate_job_id() -> str:
    return uuid.uuid4().hex


def ensure_within_limits(size_bytes: int) -> None:
    if size_bytes > MAX_FILE_MB * 1024 * 1024:
        raise JobTooLargeError(
            f"File exceeds MAX_FILE_MB ({MAX_FILE_MB} MB). Received {size_bytes} bytes."
        )


@contextmanager
def job_workspace(prefix: str = "tinyutils-job-") -> Iterator[Path]:
    """Create a temporary workspace for a single job and clean it up afterwards."""

    with tempfile.TemporaryDirectory(prefix=prefix) as tmp:
        yield Path(tmp)


def summarize_counts(counts: Dict[str, int]) -> str:
    return json.dumps(counts, sort_keys=True)
