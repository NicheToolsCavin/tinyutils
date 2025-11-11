"""Tests for the blob helper integration."""
from __future__ import annotations

import base64

import pytest
import requests

from tinyutils.api._lib import blob


@pytest.fixture(autouse=True)
def clear_env(monkeypatch):
    monkeypatch.delenv("BLOB_READ_WRITE_TOKEN", raising=False)
    monkeypatch.delenv("VERCEL_BLOB_API_URL", raising=False)


def test_upload_bytes_prefers_vercel_blob(monkeypatch):
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")

    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"url": "https://example.blob.vercel-storage.com/file.txt"}

    def fake_post(url, headers, files, timeout):  # noqa: D401 - signature matches requests
        captured["url"] = url
        captured["headers"] = headers
        captured["timeout"] = timeout
        captured["filename"] = files["file"][0]
        return FakeResponse()

    monkeypatch.setattr(blob.requests, "post", fake_post)

    url = blob.upload_bytes("file.txt", b"payload", "text/plain")

    assert url == "https://example.blob.vercel-storage.com/file.txt"
    assert "Authorization" in captured["headers"]
    assert captured["filename"] == "file.txt"
    assert captured["url"] == blob.BLOB_UPLOAD_URL


def test_upload_bytes_falls_back_on_failure(monkeypatch):
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "test-token")

    def fake_post(*args, **kwargs):  # noqa: D401
        raise requests.RequestException("boom")

    monkeypatch.setattr(blob.requests, "post", fake_post)

    url = blob.upload_bytes("file.txt", b"payload", "text/plain")

    assert url.startswith("data:text/plain;base64,")
    decoded = base64.b64decode(url.split(",", 1)[1])
    assert decoded == b"payload"


def test_upload_bytes_without_token_never_calls_blob(monkeypatch):
    monkeypatch.delenv("BLOB_READ_WRITE_TOKEN", raising=False)

    def fail_post(*args, **kwargs):  # noqa: D401
        raise AssertionError("requests.post should not run when token is missing")

    monkeypatch.setattr(blob.requests, "post", fail_post)

    url = blob.upload_bytes("file.txt", b"payload", "text/plain")

    assert url.startswith("data:text/plain;base64,")
    assert base64.b64decode(url.split(",", 1)[1]) == b"payload"
