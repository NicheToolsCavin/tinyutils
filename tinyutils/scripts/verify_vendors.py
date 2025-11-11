#!/usr/bin/env python3
"""Print SHA256 checksums for vendored native assets.

Targets:
- api/_vendor/pandoc/pandoc.xz
- all files under api/_vendor/pydantic_core/

Output format: <sha256>  <relative_path>
Always exits 0; missing items are labeled.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    targets: list[Path] = []
    pandoc = ROOT / 'api' / '_vendor' / 'pandoc' / 'pandoc.xz'
    core_dir = ROOT / 'api' / '_vendor' / 'pydantic_core'

    if pandoc.exists():
        targets.append(pandoc)
    else:
        print('MISSING  api/_vendor/pandoc/pandoc.xz')

    if core_dir.exists():
        for p in sorted(core_dir.rglob('*')):
            if p.is_file():
                targets.append(p)
    else:
        print('MISSING  api/_vendor/pydantic_core/')

    for p in targets:
        rel = p.relative_to(ROOT).as_posix()
        try:
            print(f"{sha256_file(p)}  {rel}")
        except Exception as exc:
            print(f"ERROR    {rel}  {exc}")
    return 0

if __name__ == '__main__':
    sys.exit(main())

