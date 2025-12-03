# Footnotes and Endnotes Test Document

This document tests footnote and endnote conversion across formats.

## Introduction

Rich text formats like DOCX and ODT support footnotes[^1] and endnotes[^end1] for academic and professional documents. Footnotes appear at the bottom of the page, while endnotes appear at the end of the document or section.

## Text with Multiple Notes

First paragraph with a footnote reference[^2]. This helps validate that footnotes are preserved during format conversion.

Second paragraph with another footnote[^3] to test multiple notes in sequence. The converter should maintain the note markers and their corresponding definitions.

## Nested Content

### Lists with Footnotes

- List item one with a note[^4]
- List item two without a note
- List item three with another note[^5]

### Tables with Footnotes

| Column A | Column B |
|----------|----------|
| Value 1[^6] | Value 2 |
| Value 3 | Value 4[^7] |

## Conclusion

This document contains seven footnotes total, which should be detected and preserved when converting between formats like DOCX, ODT, and Markdown[^8].

[^1]: This is the first footnote, testing basic footnote conversion.

[^2]: Second footnote with more detailed content. Footnotes can contain **bold** and *italic* formatting.

[^3]: Third footnote. Testing sequential numbering across paragraphs.

[^4]: Footnote within a list item, testing structural nesting.

[^5]: Another list footnote to ensure multiple notes in lists work.

[^6]: Footnote in a table cell, testing notes in complex structures.

[^7]: Another table footnote in a different cell.

[^8]: Final footnote in the conclusion.

[^end1]: This is an endnote example (though Markdown doesn't distinguish footnotes from endnotes - both use the same syntax).
