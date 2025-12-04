"""Helper for running converter fixtures from Node tests.

This module is intentionally minimal scaffolding. It:

- Imports the library converter (`convert.service`).
- Provides a CLI entry point that runs `convert_one()` for a single
  fixture and prints a small JSON summary to stdout.

Later phases can extend this to emit pandoc JSON / structural metrics
for lists, code blocks, and images.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from convert import service as conv_service  # type: ignore
from convert.types import ConversionOptions


def compute_metrics(markdown_text: str) -> dict[str, Any]:
    """Compute lightweight structural metrics from a markdown string.

    This uses the pandoc CLI to obtain a JSON AST and then walks that
    structure to count list, code block, and image nodes. It is
    intentionally minimal and designed for regression tests rather than
    full introspection.

    Also counts HTML <img> tags since pandoc may output figures as raw HTML.
    """

    # Write markdown to a temporary file for pandoc to consume.
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as tmp:
        tmp.write(markdown_text)
        tmp_path = tmp.name

    try:
        proc = subprocess.run(
            ["pandoc", "--from", "gfm", "--to", "json", tmp_path],
            check=True,
            capture_output=True,
            text=True,
        )
        doc = json.loads(proc.stdout)
    except Exception as exc:  # pragma: no cover - best-effort metrics
        # If pandoc is unavailable or fails, return a minimal marker so
        # callers can decide how to handle it.
        return {"error": f"pandoc_failed: {exc.__class__.__name__}"}
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    # Count HTML <img> tags in the raw markdown text since pandoc outputs
    # DOCX/ODT figures as raw HTML <figure><img>...</figure> blocks.
    import re
    html_img_count = len(re.findall(r'<img\s+[^>]*src=', markdown_text, re.IGNORECASE))

    metrics: dict[str, Any] = {
        "lists": {"bullet": 0, "ordered": 0, "maxDepth": 0},
        "codeBlocks": {"total": 0, "languages": []},
        "images": {"total": 0, "html_img_tags": html_img_count},
        "footnotes": {"total": 0},
        "headings": {"total": 0, "levels": {}},
    }

    langs: set[str] = set()

    def walk(node: Any, depth: int = 0) -> None:
        nonlocal metrics, langs
        if isinstance(node, dict):
            t = node.get("t")
            c = node.get("c")
            if t == "BulletList":
                metrics["lists"]["bullet"] += 1
                metrics["lists"]["maxDepth"] = max(metrics["lists"]["maxDepth"], depth + 1)
            elif t == "OrderedList":
                metrics["lists"]["ordered"] += 1
                metrics["lists"]["maxDepth"] = max(metrics["lists"]["maxDepth"], depth + 1)
            elif t == "CodeBlock":
                metrics["codeBlocks"]["total"] += 1
                # Pandoc: c = [attr, [lines]] or [attr, text]
                try:
                    attr = c[0]
                    classes = attr[1] if isinstance(attr, list) and len(attr) > 1 else []
                    if classes:
                        langs.add(str(classes[0]).lower())
                except Exception:
                    pass
            elif t == "Image":
                metrics["images"]["total"] += 1
            elif t == "Note":
                # Pandoc represents footnotes/endnotes as Note nodes
                metrics["footnotes"]["total"] += 1
            elif t == "Header":
                # Pandoc Header: c = [level, attr, inlines]
                metrics["headings"]["total"] += 1
                try:
                    level = c[0] if isinstance(c, list) and len(c) > 0 else 1
                    level_key = f"h{level}"
                    metrics["headings"]["levels"][level_key] = (
                        metrics["headings"]["levels"].get(level_key, 0) + 1
                    )
                except Exception:
                    pass

            # Recurse into children
            if isinstance(c, list):
                for child in c:
                    walk(child, depth + 1)
            # Pandoc top-level document nodes expose blocks under "blocks".
            blocks = node.get("blocks")
            if isinstance(blocks, list):
                for child in blocks:
                    walk(child, depth)
        elif isinstance(node, list):
            for child in node:
                walk(child, depth)

    walk(doc)
    metrics["codeBlocks"]["languages"] = sorted(langs)
    # Include HTML img tags in the total count (DOCX/ODT figures are raw HTML)
    metrics["images"]["total"] += html_img_count
    return metrics


def run_fixture(input_path: Path, from_format: str | None, targets: list[str]) -> dict:
    """Run the converter for a single fixture and return a summary dict.

    The summary intentionally exposes only high‑level information so that
    Node tests can evolve their assertions without having to know the full
    `ConversionResult` shape.
    """

    raw = input_path.read_bytes()
    opts = ConversionOptions()
    result = conv_service.convert_one(
        input_bytes=raw,
        name=input_path.name,
        targets=targets,
        from_format=from_format,
        options=opts,
    )

    outputs: list[dict] = []
    markdown_text: str | None = None
    for art in result.outputs or []:
        outputs.append(
            {
                "target": art.target,
                "name": art.name,
                "size": art.size,
            }
        )
        if art.target == "md" and markdown_text is None:
            try:
                markdown_text = art.data.decode("utf-8")
            except Exception:
                markdown_text = None

    summary: dict[str, Any] = {
        "name": result.name,
        "outputs": outputs,
        "error": None,
        "metrics": None,
    }
    if result.error is not None:
        summary["error"] = {
            "kind": result.error.kind,
            "message": result.error.message,
        }

    # Attach metrics for the primary markdown output when available.
    if markdown_text:
        summary["metrics"] = compute_metrics(markdown_text)
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run converter on a fixture")
    parser.add_argument("--input", required=True, help="Path to fixture file")
    parser.add_argument("--from-format", dest="from_format", help="Source format (e.g. md, docx, html)")
    parser.add_argument(
        "--targets",
        default="md",
        help="Comma-separated targets (default: md)",
    )
    args = parser.parse_args(argv)

    fixture_path = Path(args.input)
    if not fixture_path.exists():
        raise SystemExit(f"Fixture not found: {fixture_path}")
    targets = [t.strip() for t in str(args.targets).split(",") if t.strip()]
    if not targets:
        targets = ["md"]

    summary = run_fixture(fixture_path, args.from_format, targets)
    json.dump(summary, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
