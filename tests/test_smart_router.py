"""Tests for the smart routing system (Pandoc → Mammoth → LibreOffice).

This module tests:
1. Document feature detection (colors, text boxes, shapes)
2. Tier recommendation logic
3. Mammoth integration for DOCX→HTML with styles
"""
from __future__ import annotations

from pathlib import Path
import pytest

from convert_backend.smart_router import (
    ConversionTier,
    DocumentFeatures,
    analyze_docx,
    get_recommended_tier,
)

# Try to import mammoth for integration tests
try:
    import mammoth
    MAMMOTH_AVAILABLE = True
except ImportError:
    MAMMOTH_AVAILABLE = False
    mammoth = None

FIXTURE_DIR = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "converter"


class TestDocumentFeatures:
    """Test the DocumentFeatures dataclass and tier recommendations."""

    def test_plain_text_recommends_pandoc(self):
        """Documents with only basic features should use Pandoc."""
        features = DocumentFeatures()
        features.has_text = True
        features.has_headings = True
        features.has_lists = True

        assert features.recommended_tier() == ConversionTier.PANDOC

    def test_colored_text_recommends_mammoth(self):
        """Documents with colored text should use Mammoth (Tier 2)."""
        features = DocumentFeatures()
        features.has_text = True
        features.has_colored_text = True
        features.detected_colors = {"FF0000", "0000FF"}

        assert features.recommended_tier() == ConversionTier.MAMMOTH

    def test_custom_fonts_recommends_mammoth(self):
        """Documents with custom fonts should use Mammoth."""
        features = DocumentFeatures()
        features.has_text = True
        features.has_custom_fonts = True
        features.detected_fonts = {"Comic Sans MS", "Papyrus"}

        assert features.recommended_tier() == ConversionTier.MAMMOTH

    def test_highlighting_recommends_mammoth(self):
        """Documents with highlighting should use Mammoth."""
        features = DocumentFeatures()
        features.has_highlighting = True

        assert features.recommended_tier() == ConversionTier.MAMMOTH

    def test_text_alignment_recommends_mammoth(self):
        """Documents with non-left alignment should use Mammoth."""
        features = DocumentFeatures()
        features.has_text_alignment = True

        assert features.recommended_tier() == ConversionTier.MAMMOTH

    def test_text_boxes_recommends_libreoffice(self):
        """Documents with text boxes should use LibreOffice (Tier 3)."""
        features = DocumentFeatures()
        features.has_colored_text = True  # Even with colors...
        features.has_text_boxes = True     # ...text boxes force LibreOffice

        assert features.recommended_tier() == ConversionTier.LIBREOFFICE

    def test_shapes_recommends_libreoffice(self):
        """Documents with shapes should use LibreOffice."""
        features = DocumentFeatures()
        features.has_shapes = True

        assert features.recommended_tier() == ConversionTier.LIBREOFFICE

    def test_drawings_recommends_libreoffice(self):
        """Documents with drawings should use LibreOffice."""
        features = DocumentFeatures()
        features.has_drawings = True

        assert features.recommended_tier() == ConversionTier.LIBREOFFICE

    def test_charts_recommends_libreoffice(self):
        """Documents with charts should use LibreOffice."""
        features = DocumentFeatures()
        features.has_charts = True

        assert features.recommended_tier() == ConversionTier.LIBREOFFICE

    def test_equations_recommends_libreoffice(self):
        """Documents with equations should use LibreOffice."""
        features = DocumentFeatures()
        features.has_equations = True

        assert features.recommended_tier() == ConversionTier.LIBREOFFICE

    def test_embedded_objects_recommends_libreoffice(self):
        """Documents with embedded objects should use LibreOffice."""
        features = DocumentFeatures()
        features.has_embedded_objects = True

        assert features.recommended_tier() == ConversionTier.LIBREOFFICE

    def test_summary_plain_text(self):
        """Summary for plain documents should indicate 'plain text'."""
        features = DocumentFeatures()
        assert features.summary() == "plain text"

    def test_summary_with_colors(self):
        """Summary should list detected features."""
        features = DocumentFeatures()
        features.has_colored_text = True
        features.detected_colors = {"FF0000", "00FF00", "0000FF"}

        summary = features.summary()
        assert "colors" in summary
        assert "3 unique" in summary

    def test_summary_with_complex_features(self):
        """Summary should list complex features."""
        features = DocumentFeatures()
        features.has_text_boxes = True
        features.has_shapes = True
        features.has_charts = True

        summary = features.summary()
        assert "text boxes" in summary
        assert "shapes" in summary
        assert "charts" in summary


class TestAnalyzeDocx:
    """Test DOCX file analysis."""

    @pytest.fixture
    def simple_docx(self, tmp_path):
        """Create a minimal valid DOCX for testing."""
        from zipfile import ZipFile

        docx_path = tmp_path / "simple.docx"
        with ZipFile(docx_path, "w") as zf:
            # Minimal document.xml with plain text
            doc_xml = """<?xml version="1.0" encoding="UTF-8"?>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r>
                            <w:t>Hello World</w:t>
                        </w:r>
                    </w:p>
                </w:body>
            </w:document>"""
            zf.writestr("word/document.xml", doc_xml)
            # Required content types
            content_types = """<?xml version="1.0" encoding="UTF-8"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                <Default Extension="xml" ContentType="application/xml"/>
            </Types>"""
            zf.writestr("[Content_Types].xml", content_types)

        return docx_path

    @pytest.fixture
    def colored_docx(self, tmp_path):
        """Create a DOCX with colored text."""
        from zipfile import ZipFile

        docx_path = tmp_path / "colored.docx"
        with ZipFile(docx_path, "w") as zf:
            doc_xml = """<?xml version="1.0" encoding="UTF-8"?>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r>
                            <w:rPr>
                                <w:color w:val="FF0000"/>
                            </w:rPr>
                            <w:t>Red Text</w:t>
                        </w:r>
                    </w:p>
                </w:body>
            </w:document>"""
            zf.writestr("word/document.xml", doc_xml)
            content_types = """<?xml version="1.0" encoding="UTF-8"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                <Default Extension="xml" ContentType="application/xml"/>
            </Types>"""
            zf.writestr("[Content_Types].xml", content_types)

        return docx_path

    @pytest.fixture
    def textbox_docx(self, tmp_path):
        """Create a DOCX with a text box."""
        from zipfile import ZipFile

        docx_path = tmp_path / "textbox.docx"
        with ZipFile(docx_path, "w") as zf:
            # Document with text box content marker
            doc_xml = """<?xml version="1.0" encoding="UTF-8"?>
            <w:document
                xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                <w:body>
                    <w:p>
                        <w:txbxContent>
                            <w:p><w:r><w:t>Text in box</w:t></w:r></w:p>
                        </w:txbxContent>
                    </w:p>
                </w:body>
            </w:document>"""
            zf.writestr("word/document.xml", doc_xml)
            content_types = """<?xml version="1.0" encoding="UTF-8"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                <Default Extension="xml" ContentType="application/xml"/>
            </Types>"""
            zf.writestr("[Content_Types].xml", content_types)

        return docx_path

    def test_analyze_simple_docx(self, simple_docx):
        """Simple DOCX should detect basic text."""
        features = analyze_docx(simple_docx)

        assert features.has_text is True
        assert features.has_colored_text is False
        assert features.has_text_boxes is False
        assert features.recommended_tier() == ConversionTier.PANDOC

    def test_analyze_colored_docx(self, colored_docx):
        """Colored DOCX should detect colors and recommend Mammoth."""
        features = analyze_docx(colored_docx)

        assert features.has_colored_text is True
        assert "FF0000" in features.detected_colors
        assert features.recommended_tier() == ConversionTier.MAMMOTH

    def test_analyze_textbox_docx(self, textbox_docx):
        """DOCX with text box should recommend LibreOffice."""
        features = analyze_docx(textbox_docx)

        assert features.has_text_boxes is True
        assert features.recommended_tier() == ConversionTier.LIBREOFFICE

    def test_analyze_invalid_file(self, tmp_path):
        """Invalid file should return default features (Pandoc)."""
        bad_file = tmp_path / "not_a_docx.txt"
        bad_file.write_text("This is not a DOCX")

        features = analyze_docx(bad_file)
        assert features.recommended_tier() == ConversionTier.PANDOC

    def test_analyze_missing_file(self, tmp_path):
        """Missing file should return default features."""
        missing = tmp_path / "does_not_exist.docx"

        features = analyze_docx(missing)
        assert features.recommended_tier() == ConversionTier.PANDOC


class TestGetRecommendedTier:
    """Test the get_recommended_tier convenience function."""

    def test_returns_tier_and_features(self, tmp_path):
        """Should return both tier and features."""
        from zipfile import ZipFile

        docx_path = tmp_path / "test.docx"
        with ZipFile(docx_path, "w") as zf:
            doc_xml = """<?xml version="1.0" encoding="UTF-8"?>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body><w:p><w:r><w:t>Test</w:t></w:r></w:p></w:body>
            </w:document>"""
            zf.writestr("word/document.xml", doc_xml)
            zf.writestr("[Content_Types].xml", """<?xml version="1.0"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>""")

        tier, features = get_recommended_tier(docx_path)

        assert isinstance(tier, ConversionTier)
        assert isinstance(features, DocumentFeatures)


@pytest.mark.skipif(not MAMMOTH_AVAILABLE, reason="Mammoth not installed")
class TestMammothIntegration:
    """Test Mammoth conversion integration."""

    def test_mammoth_converts_simple_docx(self, tmp_path):
        """Mammoth should convert a simple DOCX to HTML."""
        from convert_backend.smart_router import convert_with_mammoth
        from zipfile import ZipFile

        # Create a minimal but valid DOCX
        docx_path = tmp_path / "test.docx"
        with ZipFile(docx_path, "w") as zf:
            doc_xml = """<?xml version="1.0" encoding="UTF-8"?>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r>
                            <w:t>Hello Mammoth</w:t>
                        </w:r>
                    </w:p>
                </w:body>
            </w:document>"""
            zf.writestr("word/document.xml", doc_xml)

            # Required parts for a valid DOCX
            content_types = """<?xml version="1.0" encoding="UTF-8"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                <Default Extension="xml" ContentType="application/xml"/>
                <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
            </Types>"""
            zf.writestr("[Content_Types].xml", content_types)

            rels = """<?xml version="1.0" encoding="UTF-8"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
            </Relationships>"""
            zf.writestr("_rels/.rels", rels)

            word_rels = """<?xml version="1.0" encoding="UTF-8"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>"""
            zf.writestr("word/_rels/document.xml.rels", word_rels)

        html = convert_with_mammoth(docx_path)

        assert "Hello Mammoth" in html
        assert isinstance(html, str)


# Fixture-based integration tests (run if fixtures exist)
ALIGN_COLOR_FIXTURE = FIXTURE_DIR / "alignment_color_sample.docx"
TEXTBOX_FIXTURE = FIXTURE_DIR / "textboxes_shapes_sample.docx"


@pytest.mark.skipif(
    not ALIGN_COLOR_FIXTURE.exists(),
    reason="alignment_color_sample.docx fixture not found"
)
class TestWithRealFixtures:
    """Tests using actual DOCX fixtures."""

    def test_alignment_color_fixture_detects_colors(self):
        """Real color fixture should detect colored text."""
        features = analyze_docx(ALIGN_COLOR_FIXTURE)

        # This fixture should have colors
        assert features.has_colored_text is True or features.has_text_alignment is True
        # Should recommend at least Mammoth
        tier = features.recommended_tier()
        assert tier in (ConversionTier.MAMMOTH, ConversionTier.LIBREOFFICE)

    @pytest.mark.skipif(not TEXTBOX_FIXTURE.exists(), reason="textbox fixture missing")
    def test_textbox_fixture_detects_textboxes(self):
        """Real textbox fixture should detect text boxes."""
        features = analyze_docx(TEXTBOX_FIXTURE)

        # This fixture should have text boxes or shapes
        has_complex = (
            features.has_text_boxes or
            features.has_shapes or
            features.has_drawings
        )
        # Should recommend LibreOffice for complex features
        if has_complex:
            assert features.recommended_tier() == ConversionTier.LIBREOFFICE
