"""One-off helper to probe ODT→DOCX stages for TinyUtils converter.

This script mirrors the convert_backend via-markdown pipeline for a single
ODT input and prints the sizes and small samples of:

- Raw markdown produced directly from the ODT via pandoc_runner.convert_to_markdown
- Markdown after Lua filters
- Cleaned markdown after normalise_markdown
- Final DOCX byte size produced via _render_markdown_target

It is intentionally small and side-effect free outside of its temporary
workspace. It writes intermediates only into a job_workspace under /tmp.

Usage (from repo root):

    PYPANDOC_PANDOC=/usr/local/bin/pandoc \
      python3 scripts/odt_docx_stage_probe.py \
      "/Users/cav/Local Downloads/November 16-30.odt"

The script is meant for debugging and may be removed once the issue is
fixed, or evolved into a proper automated test harness.
"""

from __future__ import annotations

import sys
from pathlib import Path

from api._lib import pandoc_runner
from convert_backend.convert_service import (
    job_workspace,
    normalise_markdown,
    _render_markdown_target,
)


def _short_sample(text: str, limit: int = 400) -> str:
    """Return a single-line preview of *text* for logging."""

    return text[:limit].replace("\n", "\\n")


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        odt_path = Path(argv[1])
    else:
        odt_path = Path("/Users/cav/Local Downloads/November 16-30.odt")

    if not odt_path.exists():
        print("SAMPLE_ODT_MISSING", odt_path)
        return 1

    print("== ODT→DOCX stage probe ==")
    print("Input path:", odt_path)

    version = pandoc_runner.get_pandoc_version()
    print("Pandoc version (pandoc_runner):", version)

    odt_bytes = odt_path.read_bytes()
    print("input_bytes:", len(odt_bytes))

    with job_workspace(prefix="odt-docx-repro-") as ws:
        print("workspace:", ws)

        input_file = ws / odt_path.name
        input_file.write_bytes(odt_bytes)

        raw_md = ws / "raw.md"
        filtered_md = ws / "filtered.md"
        cleaned_md = ws / "cleaned.md"
        media_dir = ws / "media"
        media_dir.mkdir(parents=True, exist_ok=True)

        pandoc_runner.ensure_pandoc()

        # 1) ODT → raw markdown
        pandoc_runner.convert_to_markdown(
            source=input_file,
            destination=raw_md,
            from_format="odt",
            accept_tracked_changes=True,
            extract_media_dir=media_dir,
        )
        raw_text = raw_md.read_text("utf-8", errors="replace")
        print("raw_md_bytes:", len(raw_text.encode("utf-8")))
        print("raw_md_sample:", _short_sample(raw_text))

        # 2) Lua filters
        pandoc_runner.apply_lua_filters(raw_md, filtered_md)
        filt_text = filtered_md.read_text("utf-8", errors="replace")
        print("filtered_md_bytes:", len(filt_text.encode("utf-8")))
        print("filtered_md_sample:", _short_sample(filt_text))

        # 3) normalise_markdown
        cleaned_text, stats = normalise_markdown(
            filt_text,
            remove_zero_width=True,
        )
        cleaned_md.write_text(cleaned_text, "utf-8")
        print("cleaned_md_bytes:", len(cleaned_text.encode("utf-8")))
        print("cleaned_md_sample:", _short_sample(cleaned_text))
        print("cleanup_stats:", stats.__dict__)

        # 4) cleaned markdown → DOCX
        docx_bytes = _render_markdown_target(cleaned_md, "docx")
        print("docx_bytes:", len(docx_bytes))

    return 0


if __name__ == "__main__":  # pragma: no cover - debug helper
    raise SystemExit(main(sys.argv))

