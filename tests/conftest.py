"""Pytest configuration for TinyUtils."""
from __future__ import annotations

import sys
import types
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# Provide stubs so tests can import optional deps without the real binaries.
fake_pandoc = types.SimpleNamespace(
    convert_file=lambda *_, **__: "<converted/>",
    get_pandoc_version=lambda: "test",
)
sys.modules.setdefault("pypandoc", fake_pandoc)

fake_magic = types.SimpleNamespace(from_file=lambda *_, **__: "application/octet-stream")
if "magic" in sys.modules:
    sys.modules["magic"].from_file = fake_magic.from_file  # type: ignore[attr-defined]
else:
    sys.modules["magic"] = fake_magic
