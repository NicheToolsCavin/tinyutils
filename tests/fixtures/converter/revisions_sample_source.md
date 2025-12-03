# Track Changes and Comments Test

This document tests the converter's handling of track changes and comments.

## Policy

**Track Changes:** Always accepted (final text only, no revision marks)

**Comments:** Always dropped (not represented in outputs)

## Test Content

This is the original text before any revisions.

This paragraph contains text that would have tracked insertions and deletions in a real Word document. The converter should show only the **final accepted text** with no revision marks.

This paragraph would have a comment annotation in Word. The comment text should **not appear** in the converted output.

## Expected Behavior

When this document is converted:

1. All text appears in final form (track changes accepted)
2. No revision marks or change indicators appear
3. Comment annotations are completely dropped
4. Output is clean markdown or DOCX without revision metadata

## Test Markers

FINAL_TEXT_MARKER - This text should always appear in output.

COMMENT_TEXT - This would be in a comment and should NOT appear.
