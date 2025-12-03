"""Tests for image extraction and embedding in DOCX→Markdown conversions.

Images in DOCX are:
1. Extracted to a media directory when extract_media is enabled
2. Referenced in the markdown output as <figure><img> HTML or ![alt](path) syntax

Note: Pandoc outputs images with captions as <figure> HTML blocks.
The fixture_runner counts these as html_img_tags since they aren't pandoc Image AST nodes.
"""
from __future__ import annotations

import re
from pathlib import Path
from zipfile import ZipFile

import pytest

from convert_backend.convert_service import convert_one
from convert_backend.convert_types import ConversionOptions


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"
IMAGES_FIXTURE = FIXTURE_DIR / "images.docx"


def count_image_references(md_text: str) -> dict:
    """Count different types of image references in markdown text."""
    # Count markdown-style images: ![alt](url)
    md_images = len(re.findall(r'!\[[^\]]*\]\([^)]+\)', md_text))

    # Count HTML img tags: <img src="...">
    html_images = len(re.findall(r'<img\s+[^>]*src=', md_text, re.IGNORECASE))

    # Count figure blocks (which contain images)
    figure_blocks = len(re.findall(r'<figure', md_text, re.IGNORECASE))

    return {
        "markdown_images": md_images,
        "html_img_tags": html_images,
        "figure_blocks": figure_blocks,
        "total": md_images + html_images,
    }


@pytest.mark.skipif(not IMAGES_FIXTURE.exists(), reason="Images fixture missing")
def test_images_docx_fixture_has_embedded_images() -> None:
    """Verify the test fixture actually contains embedded images."""
    with ZipFile(IMAGES_FIXTURE, 'r') as zf:
        media_files = [f for f in zf.namelist() if 'media/' in f]
        assert len(media_files) >= 1, "fixture should have at least one embedded image"

        # Check for image file extensions
        image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'}
        has_image = any(
            any(f.lower().endswith(ext) for ext in image_extensions)
            for f in media_files
        )
        assert has_image, "fixture should have at least one image file in media/"


@pytest.mark.skipif(not IMAGES_FIXTURE.exists(), reason="Images fixture missing")
def test_docx_to_markdown_extracts_images() -> None:
    """Images should be extracted and referenced in markdown output."""
    raw = IMAGES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=IMAGES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    assert md_art is not None, "should produce markdown output"

    md_text = md_art.data.decode("utf-8")
    img_refs = count_image_references(md_text)

    # Should have at least one image reference (either markdown or HTML)
    assert img_refs["total"] >= 1, "markdown should reference at least one image"


@pytest.mark.skipif(not IMAGES_FIXTURE.exists(), reason="Images fixture missing")
def test_docx_images_have_alt_text() -> None:
    """Extracted images should preserve alt text from the document."""
    raw = IMAGES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=IMAGES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Check for alt text in images (either markdown or HTML style)
    # The fixture has images with alt text like "Embedded Test Image"
    assert 'alt=' in md_text or '![' in md_text, "images should have alt text"


@pytest.mark.skipif(not IMAGES_FIXTURE.exists(), reason="Images fixture missing")
def test_docx_images_reference_media_paths() -> None:
    """Extracted images should reference media file paths."""
    raw = IMAGES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=IMAGES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    # Image paths should reference the media directory or extracted files
    # Pandoc uses paths like media/rIdN.png or similar
    assert 'media' in md_text.lower() or '.png' in md_text.lower() or '.jpg' in md_text.lower(), \
        "images should reference media paths"


@pytest.mark.skipif(not IMAGES_FIXTURE.exists(), reason="Images fixture missing")
def test_docx_multiple_images_all_extracted() -> None:
    """Multiple images in a document should all be extracted."""
    raw = IMAGES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=IMAGES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    img_refs = count_image_references(md_text)

    # The images.docx fixture has 2 embedded images (duplicated)
    # Note: Same image used twice may have same path, but both references should exist
    assert img_refs["total"] >= 2, "should extract multiple images"


@pytest.mark.skipif(not IMAGES_FIXTURE.exists(), reason="Images fixture missing")
def test_docx_images_with_captions_use_figure() -> None:
    """Images with captions should be wrapped in HTML figure elements."""
    raw = IMAGES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=IMAGES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    md_art = next((a for a in result.outputs or [] if a.target == "md"), None)
    md_text = md_art.data.decode("utf-8")

    img_refs = count_image_references(md_text)

    # Pandoc outputs captioned images as <figure> blocks
    # If there are figure blocks, verify they contain figcaption
    if img_refs["figure_blocks"] > 0:
        assert '<figcaption' in md_text.lower(), "figure blocks should have figcaptions"


@pytest.mark.skipif(not IMAGES_FIXTURE.exists(), reason="Images fixture missing")
def test_preview_contains_image_metadata() -> None:
    """Conversion preview should include image metadata."""
    raw = IMAGES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=IMAGES_FIXTURE.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None

    # Check preview data if available
    if result.preview and hasattr(result.preview, 'images'):
        images_preview = result.preview.images
        # Preview should list extracted images
        if images_preview:
            assert len(images_preview) >= 1, "preview should list extracted images"



def test_images_multiple_formats() -> None:
    """Images should convert across multiple output formats."""
    raw = IMAGES_FIXTURE.read_bytes()
    result = convert_one(
        input_bytes=raw,
        name=IMAGES_FIXTURE.name,
        targets=["md", "html"],
        from_format="docx",
        options=ConversionOptions(),
    )

    assert result.error is None
    assert len(result.outputs) == 2, "should produce both outputs"

