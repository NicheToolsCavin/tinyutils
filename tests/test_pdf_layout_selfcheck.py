import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Adjust path for local import
import sys
project_root = Path(__file__).parent.parent # Corrected: This should be the project root
sys.path.insert(0, str(project_root)) # Add project root to sys.path

from api.convert.convert_service import _pdf_output_looks_degraded

class TestPdfLayoutSelfCheck(unittest.TestCase):

    def test_degraded_output_short_text_multi_page(self):
        # Test case: short markdown text for a multi-page PDF
        markdown_text = "This is a very short document."
        stats = {"total_pages": 2, "paragraphs_detected": 1}
        self.assertTrue(_pdf_output_looks_degraded(markdown_text, stats))

    def test_degraded_output_few_paragraphs_multi_page(self):
        # Test case: few paragraphs for a multi-page PDF
        markdown_text = "Page 1 content.\n\n---\n\nPage 2 content."
        stats = {"total_pages": 2, "paragraphs_detected": 1}
        self.assertTrue(_pdf_output_looks_degraded(markdown_text, stats))

    def test_not_degraded_output_single_page_short_text(self):
        # Test case: short markdown text for a single-page PDF (not degraded)
        markdown_text = "This is a short single page document."
        stats = {"total_pages": 1, "paragraphs_detected": 1}
        self.assertFalse(_pdf_output_looks_degraded(markdown_text, stats))

    def test_not_degraded_output_sufficient_content(self):
        # Test case: sufficient content for a multi-page PDF (not degraded)
        markdown_text = "This is a longer document with multiple paragraphs.\n\n" \
                        "It spans across several pages and has good content.\n\n" \
                        "---\n\n" \
                        "More content on the second page, indicating proper extraction."
        stats = {"total_pages": 2, "paragraphs_detected": 3}
        self.assertFalse(_pdf_output_looks_degraded(markdown_text, stats))

    def test_empty_markdown(self):
        # Test case: empty markdown text
        markdown_text = ""
        stats = {"total_pages": 1, "paragraphs_detected": 0}
        self.assertTrue(_pdf_output_looks_degraded(markdown_text, stats))

        stats_multi_page = {"total_pages": 2, "paragraphs_detected": 0}
        self.assertTrue(_pdf_output_looks_degraded(markdown_text, stats_multi_page))

if __name__ == '__main__':
    unittest.main()
