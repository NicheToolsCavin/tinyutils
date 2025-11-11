#!/usr/bin/env python3
"""Download pandoc 3.1.11.1 (linux-amd64) into the vendored TinyUtils path.

This script keeps the repository portable for Vercel/serverless builds:

1. Fetch the official tarball from GitHub releases.
2. Extract only the `pandoc` binary.
3. Install it to `tinyutils/api/_vendor/pandoc/pandoc` with mode 0755.
4. Print SHA256 checksums for both the archive and final binary.

The script uses only the Python standard library. It performs no action
unless you invoke it manually.
"""

from __future__ import annotations

import hashlib
import os
import shutil
import tarfile
import tempfile
from pathlib import Path
from urllib import error, request
import lzma

PANDOC_VERSION = "3.1.11.1"
ARCHIVE_NAME = f"pandoc-{PANDOC_VERSION}-linux-amd64.tar.gz"
DOWNLOAD_URL = (
    f"https://github.com/jgm/pandoc/releases/download/{PANDOC_VERSION}/{ARCHIVE_NAME}"
)
CHUNK_SIZE = 1024 * 1024

REPO_ROOT = Path(__file__).resolve().parents[1]
TARGET_DIR = REPO_ROOT / "api" / "_vendor" / "pandoc"
TARGET_BIN = TARGET_DIR / "pandoc"
TARGET_ARCHIVE = TARGET_DIR / "pandoc.xz"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _download(url: str, destination: Path) -> None:
    try:
        with request.urlopen(url) as resp, destination.open("wb") as output:
            shutil.copyfileobj(resp, output, CHUNK_SIZE)
    except error.URLError as exc:  # pragma: no cover - invoked manually
        raise SystemExit(f"Download failed: {exc}") from exc


def _extract_binary(archive: Path, destination: Path) -> None:
    with tarfile.open(archive, "r:gz") as bundle:
        member = next(
            (
                entry
                for entry in bundle.getmembers()
                if entry.isfile() and entry.name.endswith("/pandoc")
            ),
            None,
        )
        if member is None:
            raise SystemExit("pandoc binary not found in archive")
        destination.parent.mkdir(parents=True, exist_ok=True)
        with bundle.extractfile(member) as src, destination.open("wb") as dst:
            shutil.copyfileobj(src, dst, CHUNK_SIZE)


def install() -> None:
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="tinyutils-pandoc-") as tmpdir:
        tmpdir_path = Path(tmpdir)
        archive_path = tmpdir_path / ARCHIVE_NAME

        print(f"Fetching {DOWNLOAD_URL} …")
        _download(DOWNLOAD_URL, archive_path)
        archive_sha = _sha256(archive_path)

        extracted = tmpdir_path / "pandoc"
        _extract_binary(archive_path, extracted)

        if TARGET_BIN.exists():
            TARGET_BIN.unlink()
        shutil.move(str(extracted), TARGET_BIN)

        _write_archive(TARGET_BIN, TARGET_ARCHIVE)

    os.chmod(TARGET_BIN, 0o755)
    binary_sha = _sha256(TARGET_BIN)
    archive_binary_sha = _sha256(TARGET_ARCHIVE)

    print(f"pandoc {PANDOC_VERSION} installed at {TARGET_BIN}")
    print("Checksums:")
    print(f"  download sha256: {archive_sha}")
    print(f"  binary   sha256: {binary_sha}")
    print(f"  archive  sha256: {archive_binary_sha}")


def _write_archive(source: Path, destination: Path) -> None:
    with source.open("rb") as src, lzma.open(destination, "wb", preset=9) as dst:
        shutil.copyfileobj(src, dst)


if __name__ == "__main__":  # pragma: no cover - manual utility
    install()
