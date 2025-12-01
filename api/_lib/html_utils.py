"""HTML processing utilities for converter."""

import re
from urllib.parse import urlparse
import ipaddress

# Matches src="data:..." to capture data URL payloads for pre-pandoc cleanup
_DATA_URL_RE = re.compile(r'src="data:([^"]*)"', re.IGNORECASE)

# Matches full blocks of clearly dangerous tags we never want in previews
_DANGEROUS_TAG_RE = re.compile(
    r"<\s*(script|style|iframe|object|embed)\b.*?</\s*\1\s*>",
    re.IGNORECASE | re.DOTALL,
)

# Matches inline event handler attributes such as onclick="..."
_ON_ATTR_RE = re.compile(
    r"\s+on[a-zA-Z]+\s*=\s*(?:'[^']*'|\"[^\"]*\")",
    re.IGNORECASE | re.DOTALL,
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


_SAFE_DATA_MIME_PREFIXES = (
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
)


def _is_private_host(host: str) -> bool:
    """Return True if *host* is clearly private/loopback.

    We avoid pulling in third‑party deps and rely on :mod:`ipaddress` plus
    simple string checks for common private hostnames.
    """

    host = (host or "").strip().split("%")[0]  # drop IPv6 zone id if present
    if not host:
        return False

    lower = host.lower()
    if lower in {"localhost", "localhost.", "::1"}:
        return True
    if lower.endswith(".local"):
        return True

    try:
        ip = ipaddress.ip_address(lower)
    except ValueError:
        return False
    return ip.is_private or ip.is_loopback


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
    """

    # Strip dangerous containers entirely
    cleaned = _DANGEROUS_TAG_RE.sub("", html_text)

    # Remove inline event handlers like onclick="..." / onload='...'
    cleaned = _ON_ATTR_RE.sub("", cleaned)

    # Neutralise javascript: URLs in href/src by downgrading to a harmless '#'
    cleaned = _JS_URL_RE.sub(r"\g<prefix>\g<quote>#\g<quote>", cleaned)

    # Block obviously risky data: URLs (keep only a tiny allow‑list)
    cleaned = _URL_ATTR_RE.sub(_filter_preview_data_urls, cleaned)

    # Downgrade http(s) URLs that clearly point at private hosts
    cleaned = _URL_ATTR_RE.sub(_filter_preview_private_urls, cleaned)

    return cleaned
