#!/usr/bin/env python3
"""
Download and vendor the correct manylinux pydantic-core wheel into
`api/_vendor/pydantic_core/` so Vercel can import it without compiling.

Usage:
  python3 scripts/vendor_pydantic_core.py [--version 2.41.5] [--python 312]

Detects the local Python version to choose cpXY tags. Removes any existing
`api/_vendor/pydantic_core/` directory and replaces it with fresh contents
from the wheel.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import sys
import urllib.request
import zipfile


def pick_wheel(meta: dict, version: str, cp_tag: str) -> dict | None:
    files = meta.get("releases", {}).get(version, [])
    # Prefer manylinux_2_17_x86_64 for the current cp tag
    preferred = re.compile(rf"pydantic_core-{re.escape(version)}-{re.escape(cp_tag)}-manylinux_2_17_.*_x86_64\.whl$")
    for f in files:
        if preferred.search(f.get("filename", "")):
            return f
    # Fallback: any manylinux x86_64 for this cp tag
    fallback = re.compile(rf"pydantic_core-{re.escape(version)}-{re.escape(cp_tag)}-.*manylinux.*_x86_64\.whl$")
    for f in files:
        if fallback.search(f.get("filename", "")):
            return f
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", default="2.41.5")
    parser.add_argument("--python", type=int, default=None, help="Target CPython minor (e.g., 312 for 3.12)")
    args = parser.parse_args()

    if args.python:
        cp_tag = f"cp{args.python}-cp{args.python}"
    else:
        major, minor = sys.version_info.major, sys.version_info.minor
        cp_tag = f"cp{major}{minor}-cp{major}{minor}"

    url = "https://pypi.org/pypi/pydantic-core/json"
    with urllib.request.urlopen(url, timeout=15) as r:
        meta = json.load(r)
    version = args.version
    if version not in meta.get("releases", {}):
        raise SystemExit(f"pydantic-core version {version} not found on PyPI")
    wheel = pick_wheel(meta, version, cp_tag)
    if not wheel:
        raise SystemExit(f"no manylinux x86_64 wheel for {version} ({cp_tag})")

    wheel_url = wheel["url"]
    vendor_dir = Path("api/_vendor/pydantic_core")
    if vendor_dir.exists():
        shutil.rmtree(vendor_dir)
    vendor_dir.mkdir(parents=True, exist_ok=True)

    tmp = Path("artifacts/tmp_wheels")
    tmp.mkdir(parents=True, exist_ok=True)
    whl_path = tmp / wheel["filename"]
    print("Downloading:", wheel_url)
    with urllib.request.urlopen(wheel_url, timeout=60) as src, open(whl_path, "wb") as dst:
        dst.write(src.read())
    with zipfile.ZipFile(whl_path, "r") as z:
        for name in z.namelist():
            if name.startswith("pydantic_core/"):
                z.extract(name, path=vendor_dir.parent)
    print("Vendored to:", vendor_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
