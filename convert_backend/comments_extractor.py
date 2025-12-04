"""Comment extraction helper for DOCX documents.

Extracts comments/annotations from DOCX files and formats them as markdown.
Comments are paired with their referenced text for context.
"""
from __future__ import annotations

from pathlib import Path
from typing import List, Dict, Any

from docx import Document


def extract_comments_from_docx(docx_path: Path) -> List[Dict[str, Any]]:
    """Extract all comments from a DOCX document.

    Returns a list of comment dictionaries with keys:
    - id: Comment ID
    - author: Comment author name
    - text: Comment text content
    - referenced_text: The text being commented on (if available)
    - date: Comment creation date (if available)
    """

    doc = Document(docx_path)
    comments: List[Dict[str, Any]] = []

    # Access comments via the document's part relationships
    # Comments are stored in a separate XML part
    try:
        comments_part = doc.part.part_related_by(
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
        )
    except KeyError:
        # No comments in this document
        return comments

    # Parse the comments XML
    from lxml import etree

    comments_root = etree.fromstring(comments_part.blob)
    ns = {
        "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    }

    # Extract each comment element
    for comment_elem in comments_root.findall(".//w:comment", namespaces=ns):
        comment_id = comment_elem.get(f"{{{ns['w']}}}id")
        author = comment_elem.get(f"{{{ns['w']}}}author", "Unknown")
        date = comment_elem.get(f"{{{ns['w']}}}date", "")

        # Extract comment text from paragraph elements
        text_parts: List[str] = []
        for para in comment_elem.findall(".//w:p", namespaces=ns):
            for text_elem in para.findall(".//w:t", namespaces=ns):
                if text_elem.text:
                    text_parts.append(text_elem.text)

        comment_text = " ".join(text_parts).strip()

        # Try to find the referenced text in the document
        referenced_text = _find_referenced_text(doc, comment_id, ns)

        if comment_text:  # Only add non-empty comments
            comments.append({
                "id": comment_id,
                "author": author,
                "text": comment_text,
                "referenced_text": referenced_text,
                "date": date,
            })

    return comments


def _find_referenced_text(doc: Document, comment_id: str, ns: dict) -> str:
    """Find the text that a comment references.

    Comments are marked with commentRangeStart/commentRangeEnd markers.
    """

    referenced_parts: List[str] = []
    in_range = False

    for paragraph in doc.paragraphs:
        for elem in paragraph._element.iter():  # type: ignore[attr-defined]
            # Check for comment range start
            if elem.tag.endswith("commentRangeStart"):
                cid = elem.get(f"{{{ns['w']}}}id")
                if cid == comment_id:
                    in_range = True

            # Collect text while in range
            if in_range and elem.tag.endswith("t"):
                if elem.text:
                    referenced_parts.append(elem.text)

            # Check for comment range end
            if elem.tag.endswith("commentRangeEnd"):
                cid = elem.get(f"{{{ns['w']}}}id")
                if cid == comment_id:
                    in_range = False
                    break

        if referenced_parts and not in_range:
            break

    return "".join(referenced_parts).strip()


def format_comments_as_markdown(comments: List[Dict[str, Any]]) -> str:
    """Format extracted comments as a markdown section.

    Creates a clean markdown summary of all comments with referenced text.
    """

    if not comments:
        return ""

    lines = [
        "",
        "---",
        "",
        "## Document Comments",
        "",
    ]

    for idx, comment in enumerate(comments, 1):
        author = comment.get("author", "Unknown")
        text = comment.get("text", "")
        ref_text = comment.get("referenced_text", "")

        lines.append(f"### Comment {idx} ({author})")
        lines.append("")

        if ref_text:
            lines.append(f"**Reference:** \"{ref_text}\"")
            lines.append("")

        lines.append(f"> {text}")
        lines.append("")

    return "\n".join(lines)


def append_comments_to_markdown(
    markdown_text: str,
    docx_path: Path,
) -> str:
    """Extract comments from DOCX and append to markdown output.

    This is the main entry point for the convert_service integration.
    """

    try:
        comments = extract_comments_from_docx(docx_path)
        if not comments:
            return markdown_text

        comment_section = format_comments_as_markdown(comments)
        return markdown_text + comment_section

    except Exception:
        # Silently fail - comment extraction is optional
        return markdown_text
