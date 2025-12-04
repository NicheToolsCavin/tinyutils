"""Smart routing for document conversion - picks the lightest tool for the job.

This module analyzes DOCX documents to determine which conversion tier to use:

Tier 1 (Vercel - Pandoc): Plain text, basic formatting
Tier 2 (Vercel - Mammoth): Colors, fonts, styled text
Tier 3 (Cloud Run - LibreOffice): Text boxes, shapes, complex layouts

The goal is efficiency: use the lightest tool that produces accurate results.
"""
from __future__ import annotations

import logging
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Optional, Set

logger = logging.getLogger(__name__)


class ConversionTier(Enum):
    """Which conversion tool/tier to use."""
    PANDOC = "pandoc"           # Tier 1: Fast, basic (Vercel)
    MAMMOTH = "mammoth"         # Tier 2: Colors/styles (Vercel)
    LIBREOFFICE = "libreoffice" # Tier 3: Full fidelity (Cloud Run)


@dataclass
class DocumentFeatures:
    """Features detected in a document that affect routing."""
    # Basic features (Pandoc can handle)
    has_text: bool = False
    has_headings: bool = False
    has_lists: bool = False
    has_tables: bool = False
    has_images: bool = False

    # Style features (Mammoth can handle)
    has_colored_text: bool = False
    has_custom_fonts: bool = False
    has_text_alignment: bool = False
    has_highlighting: bool = False

    # Complex features (LibreOffice required)
    has_text_boxes: bool = False
    has_shapes: bool = False
    has_drawings: bool = False
    has_charts: bool = False
    has_smartart: bool = False
    has_equations: bool = False
    has_embedded_objects: bool = False

    # Metadata
    detected_colors: Set[str] = field(default_factory=set)
    detected_fonts: Set[str] = field(default_factory=set)

    def recommended_tier(self) -> ConversionTier:
        """Determine the lightest tier that can handle this document."""
        # Tier 3: Complex features require LibreOffice
        if any([
            self.has_text_boxes,
            self.has_shapes,
            self.has_drawings,
            self.has_charts,
            self.has_smartart,
            self.has_equations,
            self.has_embedded_objects,
        ]):
            return ConversionTier.LIBREOFFICE

        # Tier 2: Style features can use Mammoth
        if any([
            self.has_colored_text,
            self.has_custom_fonts,
            self.has_text_alignment,
            self.has_highlighting,
        ]):
            return ConversionTier.MAMMOTH

        # Tier 1: Basic content uses Pandoc
        return ConversionTier.PANDOC

    def summary(self) -> str:
        """Human-readable summary of detected features."""
        features = []
        if self.has_colored_text:
            features.append(f"colors ({len(self.detected_colors)} unique)")
        if self.has_custom_fonts:
            features.append(f"fonts ({len(self.detected_fonts)} unique)")
        if self.has_text_boxes:
            features.append("text boxes")
        if self.has_shapes:
            features.append("shapes")
        if self.has_drawings:
            features.append("drawings")
        if self.has_charts:
            features.append("charts")
        if self.has_equations:
            features.append("equations")

        if not features:
            return "plain text"
        return ", ".join(features)


# OOXML namespaces
NAMESPACES = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
    'wps': 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
    'wpg': 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup',
    'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart',
    'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
}


def analyze_docx(file_path: Path) -> DocumentFeatures:
    """Analyze a DOCX file to detect features for smart routing.

    This reads the raw OOXML to detect features without fully parsing the document,
    making it fast enough to run on every conversion request.
    """
    features = DocumentFeatures()

    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            # Check document.xml for main content features
            if 'word/document.xml' in zf.namelist():
                doc_xml = zf.read('word/document.xml').decode('utf-8', errors='replace')
                _analyze_document_xml(doc_xml, features)

            # Check for drawings/charts/diagrams by file presence
            for name in zf.namelist():
                if name.startswith('word/charts/'):
                    features.has_charts = True
                elif name.startswith('word/diagrams/'):
                    features.has_smartart = True
                elif name.startswith('word/embeddings/'):
                    features.has_embedded_objects = True
                elif name.startswith('word/media/'):
                    features.has_images = True

    except zipfile.BadZipFile:
        logger.warning(f"Could not read {file_path} as DOCX, defaulting to Pandoc")
        return features
    except Exception as e:
        logger.warning(f"Error analyzing {file_path}: {e}, defaulting to Pandoc")
        return features

    return features


def _analyze_document_xml(xml_content: str, features: DocumentFeatures) -> None:
    """Parse document.xml to detect specific features."""
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        logger.warning(f"Failed to parse document.xml: {e}")
        return

    # Register namespaces for cleaner xpath
    for prefix, uri in NAMESPACES.items():
        ET.register_namespace(prefix, uri)

    # Check for text content
    paragraphs = root.findall('.//w:p', NAMESPACES)
    if paragraphs:
        features.has_text = True

    # Check for headings (pStyle with Heading*)
    for pStyle in root.findall('.//w:pStyle', NAMESPACES):
        style_val = pStyle.get(f'{{{NAMESPACES["w"]}}}val', '')
        if style_val.startswith('Heading'):
            features.has_headings = True
            break

    # Check for lists (numPr element)
    if root.find('.//w:numPr', NAMESPACES) is not None:
        features.has_lists = True

    # Check for tables
    if root.find('.//w:tbl', NAMESPACES) is not None:
        features.has_tables = True

    # Check for colored text (w:color element with val != "auto")
    for color in root.findall('.//w:color', NAMESPACES):
        color_val = color.get(f'{{{NAMESPACES["w"]}}}val', '')
        if color_val and color_val.lower() not in ('auto', '000000', 'black'):
            features.has_colored_text = True
            features.detected_colors.add(color_val)

    # Check for highlighting
    if root.find('.//w:highlight', NAMESPACES) is not None:
        features.has_highlighting = True

    # Check for custom fonts (rFonts with non-standard fonts)
    standard_fonts = {'Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Courier New'}
    for rFonts in root.findall('.//w:rFonts', NAMESPACES):
        for attr in ['ascii', 'hAnsi', 'cs', 'eastAsia']:
            font = rFonts.get(f'{{{NAMESPACES["w"]}}}{attr}', '')
            if font and font not in standard_fonts:
                features.has_custom_fonts = True
                features.detected_fonts.add(font)

    # Check for text alignment (jc element with val != "left")
    for jc in root.findall('.//w:jc', NAMESPACES):
        align = jc.get(f'{{{NAMESPACES["w"]}}}val', '')
        if align and align not in ('left', 'start'):
            features.has_text_alignment = True
            break

    # Check for drawings (contains shapes, images, etc.)
    if root.find('.//w:drawing', NAMESPACES) is not None:
        features.has_drawings = True

    # Check for text boxes (wps:txbx or w:txbxContent)
    if (root.find('.//wps:txbx', NAMESPACES) is not None or
        root.find('.//w:txbxContent', NAMESPACES) is not None):
        features.has_text_boxes = True

    # Check for shapes (wps:wsp)
    if root.find('.//wps:wsp', NAMESPACES) is not None:
        features.has_shapes = True

    # Check for equations (OMML)
    if root.find('.//m:oMath', NAMESPACES) is not None:
        features.has_equations = True


def get_recommended_tier(file_path: Path) -> tuple[ConversionTier, DocumentFeatures]:
    """Analyze a document and return the recommended conversion tier.

    Returns:
        Tuple of (recommended tier, detected features)
    """
    features = analyze_docx(file_path)
    tier = features.recommended_tier()

    logger.info(
        f"Document analysis: {features.summary()} → {tier.value} "
        f"(colors={len(features.detected_colors)}, fonts={len(features.detected_fonts)})"
    )

    return tier, features


# =============================================================================
# Conversion functions for each tier
# =============================================================================

def convert_with_mammoth(
    input_path: Path,
    output_path: Optional[Path] = None,
    preserve_styles: bool = True
) -> str:
    """Convert DOCX to HTML using Mammoth (Tier 2).

    Mammoth preserves:
    - Bold, italic, underline
    - Text colors (as inline styles)
    - Headings, lists, tables
    - Images (as base64 or extracted)

    Args:
        input_path: Path to DOCX file
        output_path: Optional path to write HTML output
        preserve_styles: Whether to include color/font styles

    Returns:
        HTML string
    """
    try:
        import mammoth
    except ImportError:
        raise RuntimeError("mammoth not installed - run: pip install mammoth")

    # Custom style mapping to preserve colors
    style_map = """
        p[style-name='Heading 1'] => h1:fresh
        p[style-name='Heading 2'] => h2:fresh
        p[style-name='Heading 3'] => h3:fresh
        p[style-name='Heading 4'] => h4:fresh
        b => strong
        i => em
        u => u
        strike => s
    """

    with open(input_path, 'rb') as docx_file:
        result = mammoth.convert_to_html(
            docx_file,
            style_map=style_map,
            include_default_style_map=True
        )

    html = result.value
    messages = result.messages

    if messages:
        for msg in messages:
            logger.debug(f"Mammoth: {msg}")

    if output_path:
        output_path.write_text(html, encoding='utf-8')

    return html


def convert_with_pandoc(
    input_path: Path,
    output_format: str = 'html',
    output_path: Optional[Path] = None,
    extra_args: Optional[List[str]] = None
) -> str:
    """Convert using Pandoc (Tier 1).

    Fast and reliable for structure, but loses colors/custom fonts.
    """
    try:
        import pypandoc
    except ImportError:
        raise RuntimeError("pypandoc not installed")

    args = extra_args or []

    output = pypandoc.convert_file(
        str(input_path),
        output_format,
        extra_args=args
    )

    if output_path:
        output_path.write_text(output, encoding='utf-8')

    return output
