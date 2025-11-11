"""Pandoc runner utilities for conversions and Lua-filter passes."""
from __future__ import annotations

from pathlib import Path
import tempfile
import lzma
from typing import Iterable, List, Optional, Tuple

import logging
import os
import re
import shutil

try:  # pragma: no cover - optional dependency
    import pypandoc  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    pypandoc = None


PANDOC_ENV_VAR = "PYPANDOC_PANDOC"
_VENDOR_DIR = Path(__file__).resolve().parents[1] / "_vendor" / "pandoc"
VENDORED_PANDOC_PATH = _VENDOR_DIR / "pandoc"
VENDORED_PANDOC_ARCHIVE = _VENDOR_DIR / "pandoc.xz"
_RUNTIME_PANDOC_DIR = Path(tempfile.gettempdir()) / "tinyutils-pandoc"
_RUNTIME_PANDOC_PATH = _RUNTIME_PANDOC_DIR / "pandoc"
_PANDOC_CACHE: Optional[str] = None
_LOGGER = logging.getLogger(__name__)


def ensure_pandoc() -> str:
    """Ensure pandoc is available without performing runtime downloads."""

    if pypandoc is None:
        raise PandocError("pypandoc not installed")

    resolved = _resolve_pandoc_path()
    if resolved:
        os.environ[PANDOC_ENV_VAR] = resolved
        return resolved

    raise PandocError(
        "pandoc binary not available; set PYPANDOC_PANDOC, run "
        "tinyutils/scripts/vendor_pandoc.py, or install pandoc on PATH."
    )


def is_pandoc_available() -> bool:
    """Return True when a usable pandoc binary is accessible."""

    if pypandoc is None:
        return False
    return _resolve_pandoc_path() is not None


def get_configured_pandoc_path() -> Optional[str]:
    """Return the discovered pandoc path without raising on failure."""

    return _resolve_pandoc_path()


class PandocError(RuntimeError):
    """Raised when a pandoc conversion fails."""


DEFAULT_OUTPUT_FORMAT = "gfm+pipe_tables+footnotes+tex_math_dollars"
BASE_ARGS = ["--wrap=none", "--reference-links"]
FILTER_DIR = Path(__file__).resolve().parents[2] / "filters"
FILTERS = (
    "softbreak_to_space.lua",
    "strip_empty_spans.lua",
    "normalize_lists.lua",
)


def get_pandoc_version() -> Optional[str]:
    if pypandoc is None:
        return None
    try:
        return str(pypandoc.get_pandoc_version())
    except OSError:  # pragma: no cover - depends on runtime
        return None


def convert_to_markdown(
    source: Path,
    destination: Path,
    from_format: Optional[str],
    accept_tracked_changes: bool = False,
    extract_media_dir: Optional[Path] = None,
    extra_args: Optional[Iterable[str]] = None,
) -> None:
    """Convert *source* into GitHub-flavoured markdown at *destination*."""

    args: List[str] = [_markdown_heading_flag(), *BASE_ARGS]
    if accept_tracked_changes:
        args.append("--track-changes=accept")
    if extract_media_dir:
        args.append(f"--extract-media={extract_media_dir}")
    if extra_args:
        args.extend(str(arg) for arg in extra_args)

    if pypandoc is None:
        raise PandocError("pypandoc not installed")
    try:
        pypandoc.convert_file(
            str(source),
            to=DEFAULT_OUTPUT_FORMAT,
            format=from_format,
            outputfile=str(destination),
            extra_args=args,
        )
    except RuntimeError as exc:  # pragma: no cover - passthrough
        raise PandocError(str(exc)) from exc


def apply_lua_filters(source: Path, destination: Path) -> None:
    """Run the second pass through Lua filters to normalise formatting."""

    filter_args = _lua_filter_args()
    if pypandoc is None:
        raise PandocError("pypandoc not installed")
    try:
        pypandoc.convert_file(
            str(source),
            to=DEFAULT_OUTPUT_FORMAT,
            format="gfm",
            outputfile=str(destination),
            extra_args=filter_args,
        )
    except RuntimeError as exc:  # pragma: no cover - passthrough
        raise PandocError(str(exc)) from exc


_HEADING_FLAG: Optional[str] = None


def _markdown_heading_flag() -> str:
    """Return the appropriate heading flag for the installed pandoc."""

    global _HEADING_FLAG
    if _HEADING_FLAG is not None:
        return _HEADING_FLAG

    version = get_pandoc_version()
    if version is not None and _version_tuple(str(version)) >= (3, 0):
        _HEADING_FLAG = "--markdown-headings=atx"
    else:
        _HEADING_FLAG = "--atx-headers"
    return _HEADING_FLAG


def _version_tuple(raw: str) -> Tuple[int, ...]:
    parts: List[int] = []
    for chunk in raw.split('.'):
        match = re.match(r"(\d+)", chunk)
        if not match:
            break
        parts.append(int(match.group(1)))
    return tuple(parts)


def _lua_filter_args() -> Optional[List[str]]:
    paths = []
    for name in FILTERS:
        candidate = FILTER_DIR / name
        if candidate.exists():
            paths.append(candidate)
    if not paths:
        return None
    return ["--lua-filter=" + str(path) for path in paths]


def _resolve_pandoc_path() -> Optional[str]:
    global _PANDOC_CACHE

    if _PANDOC_CACHE:
        cached_path = Path(_PANDOC_CACHE)
        if cached_path.exists() and os.access(_PANDOC_CACHE, os.X_OK):
            return _PANDOC_CACHE
        _PANDOC_CACHE = None

    env_path = os.environ.get(PANDOC_ENV_VAR)
    candidates: List[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    candidates.append(VENDORED_PANDOC_PATH)
    archive_candidate = _ensure_archive_pandoc()
    if archive_candidate is not None:
        candidates.append(archive_candidate)
    system_path = shutil.which("pandoc")
    if system_path:
        candidates.append(Path(system_path))

    for index, candidate in enumerate(candidates):
        if candidate.exists() and os.access(candidate, os.X_OK):
            resolved = str(candidate)
            _PANDOC_CACHE = resolved
            return resolved
        if index == 0 and env_path and not candidate.exists():
            _LOGGER.warning("pandoc env override missing path=%s", candidate)

    return None


def _ensure_archive_pandoc() -> Optional[Path]:
    """Unpack the vendored pandoc archive into /tmp when needed."""

    if not VENDORED_PANDOC_ARCHIVE.exists():
        return None

    target = _RUNTIME_PANDOC_PATH
    if target.exists() and os.access(target, os.X_OK):
        return target

    try:
        _RUNTIME_PANDOC_DIR.mkdir(parents=True, exist_ok=True)
        with lzma.open(VENDORED_PANDOC_ARCHIVE, "rb") as src, target.open("wb") as dst:
            shutil.copyfileobj(src, dst)
        os.chmod(target, 0o755)
        return target
    except Exception as exc:  # pragma: no cover - best effort
        _LOGGER.warning("Failed to unpack vendored pandoc archive: %s", exc)
        return None
