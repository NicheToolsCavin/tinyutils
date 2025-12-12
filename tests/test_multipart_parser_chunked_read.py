from __future__ import annotations

import io

import pytest

from api._lib.multipart import MultipartParseError, parse_multipart_form


class _ChunkyStream(io.BytesIO):
    """Simulate short reads even when the caller requests a large buffer."""

    def read(self, n: int = -1) -> bytes:  # type: ignore[override]
        if n is None or n < 0:
            return super().read(n)
        # Force short reads to exercise the parser's read loop.
        return super().read(min(n, 7))


def _make_multipart(boundary: str) -> bytes:
    return (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="mode"\r\n\r\n'
        "json_to_csv\r\n"
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="example.txt"\r\n'
        "Content-Type: text/plain\r\n\r\n"
        "hello\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")


def test_parse_multipart_form_handles_chunked_reads() -> None:
    boundary = "tinyutils-boundary"
    body = _make_multipart(boundary)
    headers = {
        "content-type": f"multipart/form-data; boundary={boundary}",
        "content-length": str(len(body)),
    }

    form = parse_multipart_form(headers, _ChunkyStream(body))
    assert form["mode"] == ["json_to_csv"]
    assert form["file"] == [b"hello"]


def test_parse_multipart_form_incomplete_body_raises_400() -> None:
    boundary = "tinyutils-boundary"
    body = _make_multipart(boundary)
    headers = {
        "content-type": f"multipart/form-data; boundary={boundary}",
        "content-length": str(len(body)),
    }

    with pytest.raises(MultipartParseError) as excinfo:
        parse_multipart_form(headers, _ChunkyStream(body[:-10]))

    assert excinfo.value.status == 400
