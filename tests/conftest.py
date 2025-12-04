"""Test configuration for converter backend.

Ensures the repository root is on sys.path so test modules can import
`convert_backend` and related packages without relying on external
PYTHONPATH configuration.
"""
from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
root_str = str(ROOT)
if root_str not in sys.path:
    sys.path.insert(0, root_str)

