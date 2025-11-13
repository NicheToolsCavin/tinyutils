"""Public exports for the TinyUtils converter library."""
# Fix sys.path to allow service.py to import from api._lib
import sys
from pathlib import Path
_parent = Path(__file__).resolve().parent.parent  # Go up to tinyutils/ root
if str(_parent) not in sys.path:
    sys.path.insert(0, str(_parent))

from .service import ConversionOptions, convert_batch, convert_one
from .types import (
    BatchResult,
    ConversionError,
    ConversionResult,
    InputPayload,
    MediaArtifact,
    PreviewData,
    TargetArtifact,
)

__all__ = [
    "BatchResult",
    "ConversionError",
    "ConversionOptions",
    "ConversionResult",
    "InputPayload",
    "MediaArtifact",
    "PreviewData",
    "TargetArtifact",
    "convert_batch",
    "convert_one",
]
