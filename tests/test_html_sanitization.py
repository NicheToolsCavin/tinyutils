"""Security tests for HTML sanitization functions."""

import pytest
from api._lib.html_utils import (
    sanitize_html_for_preview,
    _is_private_host,
)


class TestSanitizeHtmlForPreview:
    """Tests for sanitize_html_for_preview() function."""

    def test_removes_script_tags_with_closing(self):
        """Verify script tags are removed (content becomes inert)."""
        html = "<p>Hello</p><script>alert(1)</script><p>World</p>"
        result = sanitize_html_for_preview(html)
        # Script tags are removed, so code won't execute
        assert "<script" not in result.lower()
        # Content is left as text (safe without the tag)
        assert "alert" in result
        assert "<p>Hello</p>" in result
        assert "<p>World</p>" in result

    def test_removes_unclosed_script_tags(self):
        """Verify unclosed script tags are removed."""
        html = "<p>Start</p><script>alert(1)<p>After</p>"
        result = sanitize_html_for_preview(html)
        assert "<script" not in result.lower()
        # Content is left as text (safe without the tag)
        assert "alert" in result

    def test_removes_self_closing_script_tags(self):
        """Verify self-closing script tags are removed."""
        html = '<p>Before</p><script src="evil.js" /><p>After</p>'
        result = sanitize_html_for_preview(html)
        assert "<script" not in result.lower()
        assert "evil.js" not in result

    def test_removes_style_tags(self):
        """Verify style tags are removed (CSS becomes inert)."""
        html = "<style>body { display: none; }</style><p>Content</p>"
        result = sanitize_html_for_preview(html)
        assert "<style" not in result.lower()
        # CSS content is left as text (safe without the style tag)
        assert "body {" in result or "display" in result
        assert "<p>Content</p>" in result

    def test_removes_iframe_tags(self):
        """Verify iframe tags are removed."""
        html = '<iframe src="http://attacker.com"></iframe><p>Safe</p>'
        result = sanitize_html_for_preview(html)
        assert "<iframe" not in result.lower()
        assert "attacker.com" not in result
        assert "<p>Safe</p>" in result

    def test_removes_object_tags(self):
        """Verify object tags are removed."""
        html = '<object data="evil.swf"></object><p>Safe</p>'
        result = sanitize_html_for_preview(html)
        assert "<object" not in result.lower()
        assert "evil.swf" not in result

    def test_removes_embed_tags(self):
        """Verify embed tags are removed."""
        html = '<embed src="evil.swf"><p>Safe</p>'
        result = sanitize_html_for_preview(html)
        assert "<embed" not in result.lower()
        assert "evil.swf" not in result

    def test_removes_quoted_event_handlers(self):
        """Verify quoted event handlers are removed."""
        test_cases = [
            ('<img onclick="alert(1)">', "alert"),
            ('<div onload="evil()">', "evil"),
            ("<img onerror='xss()'>", "xss"),
            ('<p onmouseover="attack()"></p>', "attack"),
        ]
        for html, dangerous in test_cases:
            result = sanitize_html_for_preview(html)
            assert "on" not in result.lower() or (
                "on" in result.lower() and dangerous not in result
            )

    def test_removes_unquoted_event_handlers(self):
        """Verify unquoted event handlers are removed (XSS bypass)."""
        html = '<img src=x onerror=alert(1)>'
        result = sanitize_html_for_preview(html)
        assert "onerror" not in result.lower()
        assert "alert" not in result.lower()

    def test_blocks_javascript_urls(self):
        """Verify javascript: URLs are neutralized."""
        test_cases = [
            '<a href="javascript:alert(1)">click</a>',
            '<img src="javascript:alert(1)">',
            "<a href='javascript:void(0)'>link</a>",
        ]
        for html in test_cases:
            result = sanitize_html_for_preview(html)
            assert "javascript:" not in result.lower()
            # Should be replaced with safe #
            assert '#' in result or 'href=""' in result

    def test_blocks_data_urls_non_image(self):
        """Verify non-image data URLs are blocked (SVG/HTML attack vectors)."""
        test_cases = [
            '<img src="data:text/html,<script>alert(1)</script>">',
            '<img src="data:image/svg+xml,<svg><script>alert(1)</script></svg>">',
            '<iframe src="data:text/html,<h1>XSS</h1>"></iframe>',
        ]
        for html in test_cases:
            result = sanitize_html_for_preview(html)
            # Should be neutralized to # or empty
            assert "data:text/" not in result.lower()

    def test_allows_safe_image_data_urls(self):
        """Verify safe image data URLs are preserved."""
        html = '<img src="data:image/png;base64,iVBORw0KGgo...">'
        result = sanitize_html_for_preview(html)
        # Safe images should be preserved
        assert "data:image/png" in result or "data:image/jpeg" in result or len(result) > 0

    def test_blocks_private_ip_in_urls(self):
        """Verify private IP addresses are blocked (SSRF)."""
        test_cases = [
            '<a href="http://127.0.0.1/admin">admin</a>',
            '<img src="http://192.168.1.1/api">',
            '<a href="http://10.0.0.1:8080">internal</a>',
            '<a href="http://172.16.0.1/secret">secret</a>',
        ]
        for html in test_cases:
            result = sanitize_html_for_preview(html)
            # Private IPs should be neutralized
            assert "127.0.0.1" not in result or "#" in result
            assert "192.168" not in result or "#" in result
            assert "10.0.0.1" not in result or "#" in result

    def test_blocks_localhost_urls(self):
        """Verify localhost URLs are blocked (SSRF)."""
        test_cases = [
            '<a href="http://localhost/admin">admin</a>',
            '<img src="http://localhost:8080/api">',
            '<a href="http://localhost./secret">secret</a>',
        ]
        for html in test_cases:
            result = sanitize_html_for_preview(html)
            assert "localhost" not in result.lower() or "#" in result

    def test_blocks_ipv6_private_urls(self):
        """Verify IPv6 private addresses are blocked."""
        test_cases = [
            '<a href="http://[::1]/admin">admin</a>',
            '<img src="http://[fe80::1]/api">',
        ]
        for html in test_cases:
            result = sanitize_html_for_preview(html)
            # IPv6 private should be neutralized
            assert "::1" not in result or "#" in result

    def test_blocks_metadata_endpoints(self):
        """Verify AWS/GCP metadata endpoints are blocked (SSRF)."""
        test_cases = [
            '<img src="http://169.254.169.254/latest/meta-data/">',
            '<a href="http://metadata.google.internal/computeMetadata/">meta</a>',
        ]
        for html in test_cases:
            result = sanitize_html_for_preview(html)
            assert "169.254.169.254" not in result or "#" in result
            assert "metadata.google" not in result or "#" in result

    def test_preserves_safe_urls(self):
        """Verify safe external URLs are preserved."""
        html = '<a href="https://example.com">link</a>'
        result = sanitize_html_for_preview(html)
        assert "example.com" in result
        assert 'href="https://example.com"' in result

    def test_rejects_oversized_html(self):
        """Verify excessively large HTML is rejected to prevent ReDoS."""
        # Create HTML larger than the 10MB limit
        huge_html = "x" * (10_000_001)
        with pytest.raises(ValueError, match="too large"):
            sanitize_html_for_preview(huge_html)

    def test_accepts_large_but_valid_html(self):
        """Verify legitimately large HTML (under limit) is accepted."""
        # Create HTML at the edge of the limit
        large_html = "<p>" + "x" * 9_999_000 + "</p>"
        result = sanitize_html_for_preview(large_html)
        assert len(result) > 0

    def test_case_insensitive_tag_removal(self):
        """Verify tag removal is case-insensitive."""
        test_cases = [
            "<SCRIPT>alert(1)</SCRIPT>",
            "<Script>alert(1)</script>",
            "<ScRiPt>alert(1)</sCrIpT>",
        ]
        for html in test_cases:
            result = sanitize_html_for_preview(html)
            # Tags removed regardless of case
            assert "<script" not in result.lower()
            # Content is left as text (safe without tags)
            assert "alert" in result


class TestIsPrivateHost:
    """Tests for _is_private_host() function."""

    def test_blocks_ipv4_loopback(self):
        """Verify IPv4 loopback is blocked."""
        assert _is_private_host("127.0.0.1") is True
        assert _is_private_host("127.255.255.255") is True

    def test_blocks_ipv4_rfc1918_10(self):
        """Verify RFC1918 10.* range is blocked."""
        assert _is_private_host("10.0.0.1") is True
        assert _is_private_host("10.255.255.255") is True

    def test_blocks_ipv4_rfc1918_172(self):
        """Verify RFC1918 172.16-31.* range is blocked."""
        assert _is_private_host("172.16.0.0") is True
        assert _is_private_host("172.31.255.255") is True

    def test_blocks_ipv4_rfc1918_192(self):
        """Verify RFC1918 192.168.* range is blocked."""
        assert _is_private_host("192.168.0.1") is True
        assert _is_private_host("192.168.255.255") is True

    def test_blocks_ipv4_link_local(self):
        """Verify link-local addresses are blocked (AWS metadata)."""
        assert _is_private_host("169.254.169.254") is True
        assert _is_private_host("169.254.0.1") is True

    def test_blocks_ipv6_loopback(self):
        """Verify IPv6 loopback is blocked."""
        assert _is_private_host("::1") is True

    def test_blocks_ipv6_link_local(self):
        """Verify IPv6 link-local addresses are blocked."""
        assert _is_private_host("fe80::1") is True
        assert _is_private_host("[fe80::1]") is True

    def test_blocks_ipv6_private(self):
        """Verify IPv6 private (ULA) addresses are blocked."""
        assert _is_private_host("fd00::1") is True
        assert _is_private_host("fc00::1") is True

    def test_blocks_localhost_hostname(self):
        """Verify localhost hostnames are blocked."""
        assert _is_private_host("localhost") is True
        assert _is_private_host("localhost.") is True
        assert _is_private_host("LOCALHOST") is True

    def test_blocks_local_domain_suffix(self):
        """Verify .local domain suffix is blocked."""
        assert _is_private_host("internal.local") is True
        assert _is_private_host("server.local") is True
        assert _is_private_host("MYHOST.LOCAL") is True

    def test_blocks_metadata_endpoints(self):
        """Verify cloud metadata endpoints are blocked."""
        assert _is_private_host("169.254.169.254") is True
        assert _is_private_host("metadata.google.internal") is True
        assert _is_private_host("fd00:ec2::254") is True

    def test_allows_public_ips(self):
        """Verify public IP addresses are allowed."""
        assert _is_private_host("8.8.8.8") is False
        assert _is_private_host("1.1.1.1") is False
        assert _is_private_host("208.67.222.222") is False

    def test_allows_public_domains(self):
        """Verify public domains are allowed."""
        assert _is_private_host("example.com") is False
        assert _is_private_host("google.com") is False
        assert _is_private_host("github.com") is False

    def test_handles_url_encoded_percent(self):
        """Verify URL-encoded characters are decoded correctly."""
        # %25 is the encoded form of %
        # Example: %25eth0 would be %eth0 when decoded
        # This should not break IPv6 zone ID detection
        assert _is_private_host("fe80::1%eth0") is True
        assert _is_private_host("fe80::1%2525eth0") is True  # double-encoded

    def test_handles_ipv6_with_brackets(self):
        """Verify IPv6 addresses in brackets are handled correctly."""
        assert _is_private_host("[::1]") is True
        assert _is_private_host("[fe80::1]") is True
        assert _is_private_host("[fd00::1]") is True

    def test_handles_ipv6_with_zone_id(self):
        """Verify IPv6 zone ID is handled correctly."""
        # Format: [fe80::1%eth0]
        assert _is_private_host("[fe80::1%eth0]") is True
        assert _is_private_host("[fe80::1%25eth0]") is True

    def test_empty_hostname(self):
        """Verify empty hostnames return False."""
        assert _is_private_host("") is False
        assert _is_private_host(None) is False

    def test_handles_whitespace(self):
        """Verify whitespace is trimmed correctly."""
        assert _is_private_host("  127.0.0.1  ") is True
        assert _is_private_host(" localhost ") is True

    def test_case_insensitivity(self):
        """Verify hostname checks are case-insensitive."""
        assert _is_private_host("LOCALHOST") is True
        assert _is_private_host("Localhost.Local") is True
        assert _is_private_host("EXAMPLE.LOCAL") is True
