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


def ensure_within_limits(size_bytes: int, preview_check: bool = False) -> Dict[str, Any]:
    """Validate payload size and return meta flags used by converter previews."""
    max_file_bytes = MAX_FILE_MB * 1024 * 1024
    too_big = size_bytes > max_file_bytes
    too_big_for_preview = False

    # Apply stricter cap for preview rendering (avoid UI hangs)
    if preview_check:
        preview_limit = max_file_bytes // 4  # 25% of global cap
        too_big_for_preview = size_bytes > preview_limit

    if too_big:
        raise JobTooLargeError(
            f"File exceeds MAX_FILE_MB ({MAX_FILE_MB} MB). Received {size_bytes} bytes."
        )

    return {
        "approxBytes": size_bytes,
        "truncated": too_big,
        "tooBigForPreview": too_big_for_preview,
    }


def detect_rows_columns(content: str) -> tuple[int, int]:
    """Best‑effort row/column estimator for tabular text."""
    lines = content.splitlines()
    if not lines:
        return 0, 0

    rows = sum(1 for line in lines if line.strip())
    sample = [line for line in lines if line.strip()][:5]
    col_counts: list[int] = []
    for line in sample:
        if "," in line:
            col_counts.append(len(line.split(",")))
        elif "\t" in line:
            col_counts.append(len(line.split("\t")))
        elif ";" in line:
            col_counts.append(len(line.split(";")))
        else:
            words = line.strip().split()
            col_counts.append(len(words) if words else 1)

    if col_counts:
        from collections import Counter

        estimated_cols = Counter(col_counts).most_common(1)[0][0]
    else:
        estimated_cols = 1

    return rows, estimated_cols


def count_json_nodes(content: str) -> int:
    """Parse small JSON and count nodes; return 0 on parse failure."""
    import json

    try:
        parsed = json.loads(content[:1_000_000])
        return _count_nodes_recursive(parsed)
    except (json.JSONDecodeError, RecursionError, MemoryError, TypeError):
        return 0


def _count_nodes_recursive(obj) -> int:
    count = 1
    if isinstance(obj, dict):
        for value in obj.values():
            count += _count_nodes_recursive(value)
    elif isinstance(obj, list):
        for item in obj:
            count += _count_nodes_recursive(item)
    return count


def detect_html_in_disguise(content: str) -> bool:
    """Detect obvious HTML masquerading as text/CSV/JSON."""
    content_lower = content.lower().strip()
    if not content_lower:
        return False

    html_patterns = (
        "<html",
        "<head",
        "<body",
        "<div",
        "<span",
        "<table",
        "<tr",
        "<td",
        "<th",
        "<script",
        "<style",
        "</html>",
        "</body>",
        "</table>",
        "</tr>",
        "</td>",
        "</th>",
        "</script>",
        "</style>",
    )
    if any(p in content_lower for p in html_patterns):
        return True

    import re

    self_closing = re.search(r"<\s*[a-z][a-z0-9]*[^>]*\/\s*>", content_lower)
    if self_closing and not re.search(r"[=+\-@]", content_lower[:100]):
        return True
    return False


def protect_csv_formulas(content: str, prefix_char: str = "'") -> str:
    """Prefix spreadsheet formula starters (=+-@) in CSV/TSV, quoted or not."""
    lines = content.splitlines()
    protected: list[str] = []
    for line in lines:
        cells: list[str] = []
        cur = ""
        in_quotes = False
        for ch in line:
            if ch == '"':
                in_quotes = not in_quotes
                cur += ch
            elif ch == "," and not in_quotes:
                cells.append(cur)
                cur = ""
            else:
                cur += ch
        cells.append(cur)

        fixed: list[str] = []
        for cell in cells:
            trimmed = cell.strip()
            needs = False
            inner = None
            if cell.startswith('"') and cell.endswith('"') and len(cell) > 1:
                inner = cell[1:-1]
                if inner.startswith(("=", "+", "-", "@")):
                    needs = True
            elif trimmed.startswith(("=", "+", "-", "@")):
                needs = True

            if needs:
                if inner is not None:
                    fixed.append(f'"{prefix_char}{inner}"')
                else:
                    fixed.append(f"{prefix_char}{cell}")
            else:
                fixed.append(cell)
        protected.append(",".join(fixed))
    return "\n".join(protected)


def safe_parse_limited(
    content: str,
    max_size_bytes: int = 10 * 1024 * 1024,
    max_recursion: int = 100,
    timeout_seconds: int = 30,
) -> dict:
    """Parse JSON/tabular text with size/recursion/time guards; returns meta."""

    import json
    import signal
    from contextlib import contextmanager

    size = len(content.encode("utf-8"))
    if size > max_size_bytes:
        return {
            "error": f"Content too large: {size} bytes exceeds limit of {max_size_bytes}",
            "size_check_passed": False,
            "approxBytes": size,
            "truncated": True,
        }

    stripped = content.strip()
    is_json = stripped.startswith(("{", "["))
    result: Dict[str, Any] = {
        "size_check_passed": True,
        "approxBytes": size,
        "truncated": False,
        "is_json": is_json,
    }

    @contextmanager
    def _timeout(duration: int):
        def handler(_signum, _frame):
            raise TimeoutError("Parsing timed out")

        if hasattr(signal, "SIGALRM"):
            old = signal.signal(signal.SIGALRM, handler)
            signal.alarm(duration)
            try:
                yield
            finally:
                signal.alarm(0)
                signal.signal(signal.SIGALRM, old)
        else:
            yield

    if is_json:
        try:
            with _timeout(timeout_seconds):
                parsed = json.loads(content[:max_size_bytes])
                result["json_node_count"] = _count_nodes_recursive_with_limit(parsed, max_recursion)
                result["json_parsed"] = True
        except (json.JSONDecodeError, RecursionError, MemoryError, TypeError) as exc:  # noqa: PERF203
            result["json_parsed"] = False
            result["json_error"] = str(exc)
        except TimeoutError:
            result["json_parsed"] = False
            result["json_error"] = "Parsing timed out"
    else:
        rows, cols = detect_rows_columns(content)
        result["row_count"] = rows
        result["col_count"] = cols

    result["html_in_disguise"] = detect_html_in_disguise(content)
    return result


def _count_nodes_recursive_with_limit(obj, max_depth: int, current_depth: int = 0) -> int:
    if current_depth >= max_depth:
        return 1
    count = 1
    if isinstance(obj, dict):
        for value in obj.values():
            count += _count_nodes_recursive_with_limit(value, max_depth, current_depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            count += _count_nodes_recursive_with_limit(item, max_depth, current_depth + 1)
    return count


@contextmanager
def job_workspace(prefix: str = "tinyutils-job-") -> Iterator[Path]:
    """Create a temporary workspace for a single job and clean it up afterwards."""

    with tempfile.TemporaryDirectory(prefix=prefix) as tmp:
        yield Path(tmp)


def summarize_counts(counts: Dict[str, int]) -> str:
    return json.dumps(counts, sort_keys=True)
