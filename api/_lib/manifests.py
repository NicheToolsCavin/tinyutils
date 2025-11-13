"""Manifest helpers for converter outputs and previews."""
from __future__ import annotations

import difflib
from pathlib import Path
from typing import Dict, List, Optional

from .utils import PREVIEW_HEADINGS_N, PREVIEW_SNIPPETS_M


def collect_headings(markdown: str) -> List[str]:
    headings: List[str] = []
    for line in markdown.splitlines():
        if line.startswith("#"):
            headings.append(line.strip())
            if len(headings) >= PREVIEW_HEADINGS_N:
                break
    return headings


def build_snippets(before: str, after: str) -> List[Dict[str, str]]:
    diff = difflib.unified_diff(
        before.splitlines(),
        after.splitlines(),
        n=2,
        lineterm="",
    )
    snippets: List[Dict[str, str]] = []
    current_before: List[str] = []
    current_after: List[str] = []
    for line in diff:
        if line.startswith("---") or line.startswith("+++") or line.startswith("@@"):
            continue
        if line.startswith("-"):
            current_before.append(line[1:])
        elif line.startswith("+"):
            current_after.append(line[1:])
        if len(current_before) >= 2 or len(current_after) >= 2:
            snippets.append(
                {
                    "before": "\n".join(current_before),
                    "after": "\n".join(current_after),
                }
            )
            if len(snippets) >= PREVIEW_SNIPPETS_M:
                break
            current_before = []
            current_after = []
    if not snippets and (before or after):
        snippets.append({"before": before[:280], "after": after[:280]})
    return snippets


def media_manifest(media_dir: Optional[Path]) -> List[Dict[str, str]]:
    if not media_dir or not media_dir.exists():
        return []
    entries: List[Dict[str, str]] = []
    for item in sorted(media_dir.rglob("*")):
        if item.is_file():
            entries.append(
                {
                    "file": str(item.relative_to(media_dir.parent)),
                    "size": str(item.stat().st_size),
                }
            )
    return entries
