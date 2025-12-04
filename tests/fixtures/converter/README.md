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

### Footnote-specific Fixtures (Phase 1)

- **`docx_footnotes_sample.docx`** — DOCX with comprehensive footnote testing
  - Purpose: Test footnote/endnote preservation in DOCX→MD/DOCX conversions
  - Size: ~12KB
  - Content: 9 footnotes across paragraphs, lists, and tables; 7 headings (h1-h3)
  - Metrics: 9 footnotes, 7 headings, 1 bullet list
  - Critical for: Validating footnote preservation (Phase 2 requirement)

- **`odt_footnotes_sample.odt`** — ODT with comprehensive footnote testing
  - Purpose: Test footnote/endnote preservation in ODT→MD/DOCX conversions
  - Size: ~8KB
  - Content: 9 footnotes across paragraphs, lists, and tables; 7 headings
  - Metrics: 9 footnotes, 7 headings, 1 bullet list
  - Critical for: Validating ODT footnote fidelity

### Additional Format Coverage (Phase 1)

- **`rtf_sample.rtf`** — RTF with headings, lists, table, and notes
  - Purpose: Test RTF→MD conversion quality and structure preservation
  - Size: ~2.3KB
  - Content: Headings (h1-h2), bullet lists, ordered lists, table, footnote markers
  - Metrics: 5 headings, 1 bullet list, 1 ordered list
  - Note: RTF footnotes may not be preserved by pandoc (known limitation)
  - Critical for: Bringing RTF into fidelity test coverage (Phase 4)

- **`latex_complex_sample.tex`** — Advanced LaTeX with equations, lists, tables, figures, footnotes
  - Purpose: Test LaTeX→MD conversion for STEM documents
  - Size: ~2.5KB
  - Content: Sections/subsections, equations (display + inline), nested lists, table, figure environment, verbatim code, 4 footnotes
  - Metrics: Variable (depends on LaTeX parsing), includes math blocks
  - Critical for: LaTeX source testing (Phase 4)

- **`report_2025_annual.pdf`** — PDF generated from DOCX for PDF→MD testing
  - Purpose: Test PDF→Markdown extraction (layout-aware path via pdfminer)
  - Size: ~8.3KB (4 pages)
  - Content: Multi-section report with headings, lists, tables
  - Note: PDF extraction is layout-based; structure may be fuzzy
  - Critical for: PDF fidelity testing (Phase 4)

## Future Fixture Additions

To improve fidelity coverage, the following document types could be added:
- ~~Blog post DOCX with images, links, and inline formatting~~ ✓ Added (blog_post.docx, blog_post.md)
- ~~Report-style DOCX with headings (multi-level), lists, tables~~ ✓ Added (report_2025_annual.docx, report_2025_annual.md)
- ~~PDF with mixed content (text, tables, images) for PDF→Markdown testing~~ ✓ Added (report_2025_annual.pdf)
- ~~RTF with preserved formatting (bold, italic, colors)~~ ✓ Added (rtf_sample.rtf)
- ~~LaTeX source documents for STEM document testing~~ ✓ Added (latex_complex_sample.tex, sample.tex)
- ~~DOCX/ODT with footnotes and endnotes~~ ✓ Added (docx_footnotes_sample.docx, odt_footnotes_sample.odt)
- EPUB for ebook conversion testing

## Golden Metrics

See `golden-metrics.json` for expected conversion metrics per fixture per target format.
Each entry validates: non-blank output, approximate content preservation, and format-specific integrity.

