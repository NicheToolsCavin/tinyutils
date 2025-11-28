"""Type definitions for the TinyUtils converter library."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Sequence


SUPPORTED_TARGETS: Sequence[str] = ("md", "html", "txt")


@dataclass(slots=True)
class ConversionOptions:
    """Options that align with the public converter API."""

    accept_tracked_changes: bool = True
    extract_media: bool = False
    remove_zero_width: bool = True
    # Optional: desired markdown dialect for md outputs
    # Examples: 'gfm' (default), 'commonmark_x', 'markdown_strict'
    md_dialect: str | None = None
    # PDF extractor mode: 'default' (layout-aware), 'aggressive' (denser joins), 'legacy' (text-only)
    pdf_layout_mode: str | None = None
    aggressive_pdf_mode: bool = False


@dataclass(slots=True)
class InputPayload:
    """In-memory payload for a document awaiting conversion."""

    name: str
    data: bytes
    source_format: Optional[str] = None


@dataclass(slots=True)
class ConversionError:
    """Non-fatal error captured during a conversion attempt."""

    message: str
    kind: str


@dataclass(slots=True)
class TargetArtifact:
    """Artifact emitted for a requested target format."""

    target: str
    name: str
    content_type: str
    data: bytes

    @property
    def size(self) -> int:
        return len(self.data)


@dataclass(slots=True)
class MediaArtifact:
    """Optional archive that packages extracted media files."""

    name: str
    content_type: str
    data: bytes

    @property
    def size(self) -> int:
        return len(self.data)


@dataclass(slots=True)
class PreviewData:
    """Preview snippets used by the TinyUtils UI."""

    headings: List[str] = field(default_factory=list)
    snippets: List[dict] = field(default_factory=list)
    images: List[dict] = field(default_factory=list)
    html: Optional[str] = None
    content: Optional[str] = None
    format: Optional[str] = None
    approxBytes: Optional[int] = None
    row_count: Optional[int] = None
    col_count: Optional[int] = None
    jsonNodeCount: Optional[int] = None
    truncated: Optional[bool] = None
    tooBigForPreview: Optional[bool] = None


@dataclass(slots=True)
class ConversionResult:
    """Full record for a single converted payload."""

    name: str
    outputs: List[TargetArtifact] = field(default_factory=list)
    preview: Optional[PreviewData] = None
    media: Optional[MediaArtifact] = None
    logs: List[str] = field(default_factory=list)
    error: Optional[ConversionError] = None

    @property
    def succeeded(self) -> bool:
        return self.error is None and bool(self.outputs)


@dataclass(slots=True)
class BatchResult:
    """Aggregated response for convert_batch."""

    job_id: str
    results: List[ConversionResult] = field(default_factory=list)
    logs: List[str] = field(default_factory=list)

    @property
    def errors(self) -> List[ConversionError]:
        return [result.error for result in self.results if result.error]
