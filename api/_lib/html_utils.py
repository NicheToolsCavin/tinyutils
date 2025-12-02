"""HTML processing utilities for converter."""

import re
from urllib.parse import urlparse, unquote
import ipaddress

# Maximum HTML size to process to prevent ReDoS attacks
_MAX_HTML_SIZE_BYTES = 10_000_000

# Matches src="data:..." to capture data URL payloads for pre-pandoc cleanup
_DATA_URL_RE = re.compile(r'src="data:([^"]*)"', re.IGNORECASE)

# Matches opening tags for dangerous elements (simpler, more reliable than matching pairs)
# Handles: <script...>, <script />, etc. but NOT the closing tag
_DANGEROUS_OPENING_TAG_RE = re.compile(
    r"<\s*(?:script|style|iframe|object|embed)\b[^>]*>",
    re.IGNORECASE,
)

# Matches closing tags for dangerous elements
_DANGEROUS_CLOSING_TAG_RE = re.compile(
    r"</\s*(?:script|style|iframe|object|embed)\s*>",
    re.IGNORECASE,
)

# Matches inline event handler attributes with or without quotes: onclick="...", onload='...', onerror=...
_ON_ATTR_RE = re.compile(
    r"\s+on[a-zA-Z]+\s*=\s*(?:['\"](?:[^'\"]*)['\"]|[^\s>]+)",
    re.IGNORECASE,
)

# Matches javascript: URLs in href/src attributes
_JS_URL_RE = re.compile(
    r"(?P<prefix>\b(?:href|src)\s*=\s*)(?P<quote>['\"])\s*javascript:[^'\"]*(?P=quote)",
    re.IGNORECASE,
)

# Matches generic href/src attributes so we can post-process URLs
_URL_ATTR_RE = re.compile(
    r"(?P<prefix>\b(?:href|src)\s*=\s*)(?P<quote>['\"])(?P<url>[^'\"]*)(?P=quote)",
    re.IGNORECASE,
)


# Safe image MIME types for data URLs (excludes SVG which can contain scripts)
_SAFE_DATA_MIME_PREFIXES = (
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/avif",
)


def _is_private_host(host: str) -> bool:
    """Return True if *host* is clearly private/loopback/metadata.

    Blocks:
    - Loopback addresses (127.0.0.1, ::1)
    - RFC1918 private ranges (10.*, 172.16.*, 192.168.*)
    - Link-local addresses (169.254.*, fe80::)
    - Reserved/special ranges (0.0.0.0, 255.255.255.255, etc.)
    - Cloud metadata endpoints (169.254.169.254 for AWS/GCP)
    - .local domains (mDNS)

    We avoid pulling in third-party deps and rely on :mod:`ipaddress` plus
    simple string checks for common private hostnames.
    """

    if not host:
        return False

    # URL decode if necessary to catch encoding tricks like %25 (encoded %)
    # Only decode once to avoid double-decode attacks
    try:
        decoded_host = unquote(host, errors="strict")
    except Exception:
        # If decoding fails, use the original
        decoded_host = host

    # Extract IPv6 zone ID safely (only for bracketed IPv6 addresses)
    # Format: [fe80::1%eth0] → extract "fe80::1"
    clean_host = decoded_host.strip()
    if clean_host.startswith("[") and "]" in clean_host:
        # Bracketed IPv6: extract the IP part before ]
        clean_host = clean_host[1:clean_host.index("]")]
    else:
        # For non-bracketed addresses, don't split on % as it could be URL encoding
        pass

    if not clean_host:
        return False

    lower = clean_host.lower()

    # Check simple hostname matches first
    if lower in {"localhost", "localhost.", "::1"}:
        return True

    # Check .local domain suffix
    if lower.endswith(".local") or lower.endswith(".localhost"):
        return True

    # Check cloud/container metadata endpoints
    if lower in {
        "169.254.169.254",  # AWS/GCP/Azure metadata
        "fd00:ec2::254",  # AWS IPv6 metadata
        "metadata.google.internal",  # GCP
    }:
        return True

    # Try to parse as IP address for comprehensive checking
    try:
        ip = ipaddress.ip_address(lower)
    except ValueError:
        # Not an IP address, just a hostname - already checked .local above
        return False

    # Use ipaddress module checks for comprehensive range validation
    # This covers: is_private (RFC1918), is_loopback, is_link_local, is_reserved
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local  # 169.254.0.0/16, fe80::/10
        or ip.is_reserved  # Special ranges like 0.0.0.0/8, 255.255.255.255, etc.
    )


def _filter_preview_data_urls(match: re.Match[str]) -> str:
    """Filter ``data:`` URLs used in preview HTML.

    We allow a very small allow‑list of safe image mime types and neutralise
    everything else to ``#`` while keeping the attribute structure intact.
    """

    prefix = match.group("prefix")
    quote = match.group("quote")
    url = (match.group("url") or "").strip()

    if not url.lower().startswith("data:"):
        return match.group(0)

    payload = url[5:]  # strip "data:"
    mime, _sep, _rest = payload.partition(",")
    mime_lower = mime.lower()
    if any(mime_lower.startswith(p) for p in _SAFE_DATA_MIME_PREFIXES):
        # Leave safe image data URLs untouched
        return match.group(0)

    # Neutralise everything else
    return f"{prefix}{quote}#{quote} data-url-removed=\"blocked-data-url\""


def _filter_preview_private_urls(match: re.Match[str]) -> str:
    """Filter href/src URLs that clearly point at private hosts.

    Any ``http(s)`` URL whose host resolves to loopback/RFC1918/.local is
    downgraded to ``#`` so previews cannot be used to poke at internal
    services from the browser.
    """

    prefix = match.group("prefix")
    quote = match.group("quote")
    url = (match.group("url") or "").strip()

    if not url:
        return match.group(0)

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return match.group(0)

    if not parsed.hostname:
        return match.group(0)

    if not _is_private_host(parsed.hostname):
        return match.group(0)

    return f"{prefix}{quote}#{quote} data-url-removed=\"blocked-private-url\""


def sanitize_html_for_pandoc(html_text: str) -> str:
    """Best-effort sanitisation for HTML before pandoc.

    Valid data: URLs are left as-is. Obviously malformed data URLs have their
    src cleared and a marker attribute added so they do not cause pandoc
    parse errors while still leaving useful context in the document.

    This function is intentionally narrow: it focuses on fixing up `data:`
    URLs so pandoc does not choke while leaving the rest of the document
    structure unchanged.

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


def sanitize_html_for_preview(html_text: str) -> str:
    """Sanitise HTML used in converter previews.

    This is stricter than :func:`sanitize_html_for_pandoc` and is used for
    HTML that will be rendered inside the sandboxed preview iframe. It
    removes clearly dangerous blocks and neutralises inline script hooks
    while keeping the rest of the markup intact.

    The goal is "safe enough" for untrusted content without pulling in a
    heavy HTML sanitizer dependency.

    This function blocks:
    - Dangerous tags: <script>, <style>, <iframe>, <object>, <embed>
    - Inline event handlers: onclick, onload, onerror, etc. (quoted or unquoted)
    - javascript: URLs in href/src attributes
    - Risky data: URLs (only safe image MIME types allowed)
    - Private/metadata IP addresses (SSRF protection)

    Args:
        html_text: Raw HTML text that may contain malicious content

    Returns:
        Sanitized HTML safe for rendering in a preview iframe

    Raises:
        ValueError: If html_text exceeds maximum safe size
    """

    # Prevent ReDoS attacks by rejecting overly large HTML
    if len(html_text) > _MAX_HTML_SIZE_BYTES:
        raise ValueError(
            f"HTML content too large ({len(html_text)} bytes, max {_MAX_HTML_SIZE_BYTES})"
        )

    # Strip dangerous opening tags entirely (handles <script>, <script />, etc.)
    cleaned = _DANGEROUS_OPENING_TAG_RE.sub("", html_text)

    # Strip dangerous closing tags
    cleaned = _DANGEROUS_CLOSING_TAG_RE.sub("", cleaned)

    # Remove inline event handlers (handles both quoted and unquoted attributes)
    # Examples removed: onclick="...", onload='...', onerror=alert(1)
    cleaned = _ON_ATTR_RE.sub("", cleaned)

    # Neutralise javascript: URLs in href/src by downgrading to a harmless '#'
    cleaned = _JS_URL_RE.sub(r"\g<prefix>\g<quote>#\g<quote>", cleaned)

    # Block obviously risky data: URLs (keep only a tiny allow‑list)
    cleaned = _URL_ATTR_RE.sub(_filter_preview_data_urls, cleaned)

    # Downgrade http(s) URLs that clearly point at private hosts
    cleaned = _URL_ATTR_RE.sub(_filter_preview_private_urls, cleaned)

    return cleaned
