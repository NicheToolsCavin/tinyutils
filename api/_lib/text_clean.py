"""Unicode and whitespace cleanup utilities for Markdown output."""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

ZERO_WIDTH_RE = re.compile("[\u200B\u200C\u200D\uFEFF]")
# Be conservative when collapsing blank lines so we do not accidentally
# disturb list or code-block structure. Only trim very long runs.
MULTI_BLANK_RE = re.compile(r"\n{4,}")


@dataclass
class CleanupStats:
    softbreaks_replaced: int = 0
    nbsp_replaced: int = 0
    zero_width_removed: int = 0


def normalise_markdown(
    text: str,
    *,
    remove_zero_width: bool = True,
) -> tuple[str, CleanupStats]:
    stats = CleanupStats()

    normalised = unicodedata.normalize("NFC", text)

    nbsp_replaced, normalised = _replace(normalised, "\u00A0", " ")
    stats.nbsp_replaced = nbsp_replaced

    if remove_zero_width:
        before = len(normalised)
        normalised = ZERO_WIDTH_RE.sub("", normalised)
        stats.zero_width_removed = before - len(normalised)

    lines = [line.rstrip() for line in normalised.splitlines()]
    normalised = "\n".join(lines)
    normalised = MULTI_BLANK_RE.sub("\n\n", normalised)

    return normalised, stats


def _replace(text: str, needle: str, replacement: str) -> tuple[int, str]:
    count = text.count(needle)
    if count:
        text = text.replace(needle, replacement)
    return count, text
