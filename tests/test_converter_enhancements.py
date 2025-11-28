"""Tests for converter enhancements: payload caps, meta flags, etc."""
import pytest
from api._lib.utils import (
    ensure_within_limits, 
    detect_rows_columns, 
    count_json_nodes, 
    detect_html_in_disguise, 
    protect_csv_formulas
)
from convert_backend.convert_types import PreviewData


class TestPayloadCaps:
    """Test payload size caps and short-circuit functionality."""
    
    def test_ensure_within_limits_normal_size(self):
        """Test that normal size payloads pass the limit check."""
        # Use a size well within the default limits (100MB)
        result = ensure_within_limits(1000)  # 1KB
        assert result["approxBytes"] == 1000
        assert result["truncated"] is False
        assert result["tooBigForPreview"] is False
    
    def test_ensure_within_limits_too_big(self):
        """Test that oversized payloads raise JobTooLargeError."""
        from api._lib.utils import JobTooLargeError
        from api._lib.utils import MAX_FILE_MB
        
        oversized_size = (MAX_FILE_MB + 1) * 1024 * 1024  # 1MB over limit
        
        with pytest.raises(JobTooLargeError):
            ensure_within_limits(oversized_size)
    
    def test_ensure_within_limits_preview_check(self):
        """Test preview-specific size checks."""
        # Use a size that's OK for normal but too big for preview 
        # (100MB default / 4 = 25MB preview limit)
        normal_size = 50 * 1024 * 1024  # 50MB - OK for normal, too big for preview
        
        # Should be OK normally
        result = ensure_within_limits(normal_size)
        assert result["approxBytes"] == normal_size
        assert result["tooBigForPreview"] is False
        
        # Should be flagged as too big for preview
        result = ensure_within_limits(normal_size, preview_check=True)
        assert result["approxBytes"] == normal_size
        assert result["tooBigForPreview"] is True


class TestMetaFlags:
    """Test meta flags functionality."""
    
    def test_detect_rows_columns_empty(self):
        """Test row/column detection with empty content."""
        rows, cols = detect_rows_columns("")
        assert rows == 0
        assert cols == 0
    
    def test_detect_rows_columns_csv(self):
        """Test row/column detection for CSV content."""
        csv_content = "name,age,city\nJohn,25,NYC\nJane,30,LA"
        rows, cols = detect_rows_columns(csv_content)
        assert rows == 3  # 3 data rows
        assert cols == 3  # 3 columns
    
    def test_detect_rows_columns_tsv(self):
        """Test row/column detection for TSV content."""
        tsv_content = "name\tage\tcity\nJohn\t25\tNYC\nJane\t30\tLA"
        rows, cols = detect_rows_columns(tsv_content)
        assert rows == 3  # 3 data rows
        assert cols == 3  # 3 columns
    
    def test_count_json_nodes(self):
        """Test JSON node counting."""
        json_content = '{"name": "John", "age": 25, "address": {"city": "NYC", "zip": "12345"}}'
        node_count = count_json_nodes(json_content)
        # Root object + name + age + address + city + zip = 6 nodes
        assert node_count == 6
    
    def test_count_json_nodes_invalid_json(self):
        """Test JSON node counting with invalid JSON."""
        invalid_json = "not a json string"
        node_count = count_json_nodes(invalid_json)
        assert node_count == 0
    
    def test_preview_data_meta_fields(self):
        """Test that PreviewData includes new meta fields."""
        preview = PreviewData(
            approxBytes=1000,
            row_count=10,
            col_count=5,
            jsonNodeCount=20,
            truncated=True,
            tooBigForPreview=True
        )
        
        assert preview.approxBytes == 1000
        assert preview.row_count == 10
        assert preview.col_count == 5
        assert preview.jsonNodeCount == 20
        assert preview.truncated is True
        assert preview.tooBigForPreview is True


class TestHtmlInDisguise:
    """Test HTML-in-disguise detection functionality."""
    
    def test_detect_html_in_disguise_normal_content(self):
        """Test that normal content is not detected as HTML in disguise."""
        normal_content = "This is just plain text content"
        assert detect_html_in_disguise(normal_content) is False
    
    def test_detect_html_in_disguise_html_content(self):
        """Test that HTML content is detected as HTML in disguise."""
        html_content = "<html><head><title>Test</title></head><body><p>Hello World</p></body></html>"
        assert detect_html_in_disguise(html_content) is True
    
    def test_detect_html_in_disguise_csv_with_html(self):
        """Test that CSV containing HTML is detected as HTML in disguise."""
        csv_html = 'name,html\nJohn,"<div>Hello</div>"'
        assert detect_html_in_disguise(csv_html) is True


class TestCsvFormulaProtection:
    """Test CSV formula prefixing functionality."""
    
    def test_protect_csv_formulas_simple(self):
        """Test basic CSV formula protection."""
        csv_content = "name,formula\nJohn,=SUM(A1:A5)\nJane,=1+1"
        protected = protect_csv_formulas(csv_content)
        assert "'=SUM(A1:A5)" in protected  # The formula should be prefixed
        assert "'=1+1" in protected  # The formula should be prefixed
    
    def test_protect_csv_formulas_with_quotes(self):
        """Test CSV formula protection with quoted content."""
        csv_content = 'name,formula\nJohn,"=SUM(A1:A5)"'
        protected = protect_csv_formulas(csv_content)
        # The formula within quotes should be prefixed after the opening quote
        assert '"\'=SUM(A1:A5)"' in protected
    
    def test_protect_csv_formulas_already_prefixed(self):
        """Test that already prefixed formulas are not double-prefixed."""
        csv_content = "name,formula\nJohn,'=SUM(A1:A5)"
        protected = protect_csv_formulas(csv_content)
        # Should remain unchanged as it's already prefixed
        assert "'=SUM(A1:A5)" in protected
    
    def test_protect_csv_formulas_non_formula(self):
        """Test that non-formula content is not modified."""
        csv_content = "name,data\nJohn,regular text\nJane,12345"
        protected = protect_csv_formulas(csv_content)
        # Should remain unchanged
        assert protected == csv_content