# Images Stress Test

This document is used to check how embedded and linked images behave
through DOCX → Markdown conversions.

## Embedded images

Here is a small embedded test image:

![Embedded Test Image](test_image.png)

And the same image again to see how duplicates are handled:

![Embedded Test Image 2](test_image.png)

## Linked image

This image uses a remote URL and should be treated differently from
embedded assets:

![Remote Logo](https://example.com/logo.png)

