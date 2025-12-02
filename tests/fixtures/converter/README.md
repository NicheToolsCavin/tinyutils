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

## Fixture Inventory

### Real-world Documents (High Fidelity Testing)

- **`November 16-30.odt`** — Multi-page newsletter ODT with actual document content
  - Purpose: Test ODT→DOCX/PDF conversion quality and verify blank output bug is fixed
  - Size: ~24KB
  - Content: Newsletter with varied formatting, sections, and styling
  - Critical for: ODT→DOCX fidelity (primary use case reported in bug)

- **`blog_post.docx`** — Blog article DOCX with rich formatting and code examples
  - Purpose: Test preservation of blog/article content with multiple structural elements
  - Size: ~14KB
  - Content: Blog post with headings, inline formatting, blockquotes, code blocks, tables, links
  - Metrics: 6 bullet lists, 1 ordered list, 2 code blocks
  - Critical for: Validating fidelity of content-rich documents with code preservation

- **`report_2025_annual.docx`** — Comprehensive annual report DOCX
  - Purpose: Test conversion of complex business documents with nested structures
  - Size: ~14KB
  - Content: Multi-section report with multiple-level headings, complex tables, nested lists
  - Metrics: 14 bullet lists, 3 ordered lists (max depth 2), 1 code block
  - Critical for: Validating structural preservation in complex documents (headings, nesting)

### Test-specific Fixtures

- **`tech_doc.md`** — Markdown source with headings, tables, lists, code,
  blockquotes, images, and links.
  - Tests: Markdown preservation in conversions, code block rendering

- **`lists.docx`** — DOCX with deep/mixed ordered + unordered lists
  - Tests: List structure preservation, nesting levels, format conversion

- **`images.docx`** — DOCX with multiple embedded images
  - Tests: Image extraction, media embedding in target formats

- **`html_input.html`** — HTML with `<pre><code>` blocks, lists, and
  `data:` URLs (one valid, one intentionally malformed)
  - Tests: HTML sanitization, data URL handling, code block conversion

- **`sample.csv`, `sample.json`, `sample.tex`, `sample.txt`** — Format-specific test files
  - Tests: Preview rendering, format-specific handlers

## Future Fixture Additions

To improve fidelity coverage, the following document types should be added:
- ~~Blog post DOCX with images, links, and inline formatting~~ ✓ Added (blog_post.docx, blog_post.md)
- ~~Report-style DOCX with headings (multi-level), lists, tables~~ ✓ Added (report_2025_annual.docx, report_2025_annual.md)
- PDF with mixed content (text, tables, images) for PDF→Markdown testing
- EPUB for ebook conversion testing
- RTF with preserved formatting (bold, italic, colors)
- LaTeX source documents for STEM document testing

## Golden Metrics

See `golden-metrics.json` for expected conversion metrics per fixture per target format.
Each entry validates: non-blank output, approximate content preservation, and format-specific integrity.

