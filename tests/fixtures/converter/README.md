# Converter Fidelity Fixtures

This directory contains canonical input documents used to exercise the
TinyUtils converter in fidelity tests.

The goal is to cover:

- Technical docs with fenced code blocks and language tags.
- Deep, mixed ordered/unordered lists (including nesting).
- Documents with embedded images.
- HTML inputs with `<pre><code>` blocks and `data:` URLs.

These fixtures will be used by future tests and scripts to run
repeatable conversions (MD→DOCX/HTML, DOCX→MD, HTML→MD) and to compare
behavior before/after fidelity improvements.

Current fixtures:

- `tech_doc.md` — Markdown source with headings, tables, lists, code,
  blockquotes, images, and links.

- `lists.docx` — DOCX with deep/mixed ordered + unordered lists.
- `images.docx` — DOCX with multiple embedded images.
- `html_input.html` — HTML with `<pre><code>` blocks, lists, and
  `data:` URLs (one valid, one intentionally malformed).

