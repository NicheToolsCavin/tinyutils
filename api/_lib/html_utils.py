"""HTML processing utilities for converter."""

import re

# Matches src="data:..." to capture data URL payloads
_DATA_URL_RE = re.compile(r'src="data:([^"]*)"', re.IGNORECASE)


def sanitize_html_for_pandoc(html_text: str) -> str:
    """Best-effort sanitisation for HTML before pandoc.

    Valid data: URLs are left as-is. Obviously malformed data URLs have their
    src cleared and a marker attribute added so they do not cause pandoc
    parse errors while still leaving useful context in the document.

    Args:
        html_text: Raw HTML text that may contain data URLs

    Returns:
        Sanitized HTML with invalid data URLs marked
    """

    def _replace(match: re.Match[str]) -> str:
        value = match.group(1)
        # Consider it valid only if it looks like a data URL with base64
        # payload. This is intentionally strict.
        if ";base64," in value:
            return f'src="data:{value}"'
        return 'src="" data-url-removed="invalid-data-url"'

    return _DATA_URL_RE.sub(_replace, html_text)
