"""Helpers for compiling and applying find/replace expressions safely."""
from __future__ import annotations

import os
from bisect import bisect_right
from dataclasses import dataclass
from typing import Iterable, List, Sequence, Tuple

import regex

DEFAULT_MAX_MATCHES = int(os.getenv("MAX_MATCHES_PER_FILE", "50000"))
DEFAULT_SAMPLE_LIMIT = int(os.getenv("PREVIEW_SNIPPETS_M", "4"))
DEFAULT_CONTEXT_LINES = int(os.getenv("PREVIEW_CONTEXT_LINES", "2"))
DEFAULT_REGEX_TIMEOUT = float(os.getenv("REGEX_TIMEOUT_SECONDS", "1.5"))


class RegexTimeoutError(RuntimeError):
    """Raised when regex evaluation times out."""


class TooManyMatchesError(RuntimeError):
    """Raised when a file exceeds the configured match limit."""


@dataclass
class Sample:
    line: int
    match: str
    context_before: List[str]
    context_after: List[str]


def compile_expression(
    pattern: str,
    *,
    mode: str,
    multiline: bool,
    case_sensitive: bool,
    whole_word: bool,
) -> regex.Pattern:
    if mode == "literal":
        pattern = regex.escape(pattern)
    flags = regex.VERSION1
    if not case_sensitive:
        flags |= regex.IGNORECASE
    if multiline:
        flags |= regex.MULTILINE | regex.DOTALL
    if whole_word:
        pattern = rf"\b(?:{pattern})\b"
    try:
        return regex.compile(pattern, flags)
    except regex.error as exc:  # pragma: no cover - depends on pattern
        raise ValueError(str(exc)) from exc


def scan_text(
    text: str,
    compiled: regex.Pattern,
    *,
    max_matches: int = DEFAULT_MAX_MATCHES,
    sample_limit: int = DEFAULT_SAMPLE_LIMIT,
    context_lines: int = DEFAULT_CONTEXT_LINES,
    timeout: float = DEFAULT_REGEX_TIMEOUT,
) -> Tuple[int, List[Sample]]:
    line_offsets, lines = _line_offsets(text)
    samples: List[Sample] = []
    match_count = 0
    try:
        iterator = compiled.finditer(text, timeout=timeout)
        for match in iterator:
            match_count += 1
            if match_count > max_matches:
                raise TooManyMatchesError(
                    f"Match count {match_count} exceeds limit {max_matches}"
                )
            if len(samples) >= sample_limit:
                continue
            line_index = _line_for_offset(line_offsets, match.start())
            before = _slice_lines(lines, max(0, line_index - context_lines), line_index)
            after = _slice_lines(
                lines, line_index + 1, line_index + 1 + context_lines
            )
            samples.append(
                Sample(
                    line=line_index + 1,
                    match=match.group(0)[:200],
                    context_before=before,
                    context_after=after,
                )
            )
    except regex.TimeoutError as exc:  # pragma: no cover - depends on input
        raise RegexTimeoutError(str(exc)) from exc

    return match_count, samples


def apply_replacement(
    text: str,
    compiled: regex.Pattern,
    replacement: str,
    *,
    max_matches: int = DEFAULT_MAX_MATCHES,
    timeout: float = DEFAULT_REGEX_TIMEOUT,
) -> Tuple[str, int]:
    try:
        result, count = compiled.subn(replacement, text, timeout=timeout)
    except regex.TimeoutError as exc:  # pragma: no cover - depends on input
        raise RegexTimeoutError(str(exc)) from exc
    if count > max_matches:
        raise TooManyMatchesError(
            f"Replacement count {count} exceeds limit {max_matches}"
        )
    return result, count


def _line_offsets(text: str) -> Tuple[List[int], Sequence[str]]:
    lines = text.splitlines()
    offsets: List[int] = []
    cursor = 0
    for line in lines:
        offsets.append(cursor)
        cursor += len(line) + 1  # account for newline
    return offsets, lines


def _line_for_offset(offsets: Sequence[int], position: int) -> int:
    idx = bisect_right(offsets, position) - 1
    return max(idx, 0)


def _slice_lines(lines: Sequence[str], start: int, end: int) -> List[str]:
    return [line[:200] for line in lines[start:end]]
