"""LibreOffice-based conversion utilities for advanced features.

This module is used as an optional pre-processing step before the
standard pandoc pipeline. When enabled, it converts rich Office
documents (DOCX/ODT/RTF) to HTML using LibreOffice in headless mode and
optionally inspects the HTML to extract color and alignment metadata.

The main entry points are:

* :func:`is_libreoffice_available` – quick availability probe
* :func:`convert_via_libreoffice` – run soffice and return HTML + meta

The higher-level pipeline decides when to call this module based on
``ConversionOptions`` flags and will gracefully fall back to the normal
path when LibreOffice is absent or fails.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Tuple


_SOFFICE_BIN = os.getenv("SOFFICE_BIN", "soffice")
_TIMEOUT_SECONDS = int(os.getenv("LIBREOFFICE_TIMEOUT_SECONDS", "60"))


def is_libreoffice_available() -> bool:
    """Return True if the LibreOffice binary appears to be available.

    This performs a lightweight check using :func:`shutil.which` and a
    very short ``--version`` probe to avoid hanging on misconfigured
    systems. Any failure is treated as "not available".
    """

    if shutil.which(_SOFFICE_BIN) is None:
        return False
    try:
        subprocess.run(  # nosec - controlled binary invocation
            [_SOFFICE_BIN, "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
        )
    except Exception:
        return False
    return True


def _run_soffice_to_html(input_path: Path, outdir: Path) -> Path:
    """Run LibreOffice in headless mode to produce an HTML file.

    Parameters
    ----------
    input_path:
        Path to the source document (DOCX/ODT/RTF).
    outdir:
        Directory where LibreOffice should write its output.
    """

    outdir.mkdir(parents=True, exist_ok=True)
    cmd = [
        _SOFFICE_BIN,
        "--headless",
        "--convert-to",
        "html",
        "--outdir",
        str(outdir),
        str(input_path),
    ]
    proc = subprocess.run(  # nosec - controlled binary invocation
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=_TIMEOUT_SECONDS,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"LibreOffice conversion failed: {proc.stderr.strip()}")

    html_path = outdir / f"{input_path.stem}.html"
    if not html_path.exists():
        raise RuntimeError(f"LibreOffice did not produce HTML at {html_path!s}")
    return html_path


def _extract_styles_from_html(html_text: str) -> Dict[str, Any]:
    """Extract simple color/alignment statistics from HTML text.

    This is deliberately lightweight; it is used for logging and future
    enhancement, not for strict functional behaviour. If BeautifulSoup
    is unavailable, the function degrades to returning zero counts.
    """

    try:
        from bs4 import BeautifulSoup  # type: ignore
    except Exception:
        return {"colors_extracted": 0, "alignments_extracted": 0}

    soup = BeautifulSoup(html_text, "html.parser")
    colors = 0
    aligns = 0

    for elem in soup.find_all(style=True):
        style = elem.get("style", "") or ""
        style_lower = style.lower()
        if "color:" in style_lower:
            colors += 1
        if "text-align:" in style_lower:
            aligns += 1

    return {"colors_extracted": colors, "alignments_extracted": aligns}


def convert_via_libreoffice(
    input_path: Path,
    *,
    preserve_colors: bool = False,
    preserve_alignment: bool = False,
) -> Tuple[str, Dict[str, Any]]:
    """Convert a document to HTML via LibreOffice and compute style meta.

    The returned HTML is fed back into the existing pandoc pipeline. Any
    failure in this function should be caught by callers, who are
    expected to fall back to the standard pandoc path.
    """

    # In most cases ``input_path`` already lives in a per-job workspace.
    # We keep all LibreOffice artifacts in a dedicated temp directory to
    # avoid cluttering that workspace.
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        html_path = _run_soffice_to_html(input_path, tmpdir_path)
        html_text = html_path.read_text("utf-8", errors="replace")

    meta: Dict[str, Any] = {"colors_extracted": 0, "alignments_extracted": 0}
    if preserve_colors or preserve_alignment:
        meta.update(_extract_styles_from_html(html_text))
    return html_text, meta

