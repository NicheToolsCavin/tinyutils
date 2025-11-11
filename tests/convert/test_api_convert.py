"""Integration tests for the FastAPI converter endpoint."""
from __future__ import annotations

import pytest

pytest.importorskip("httpx")

from fastapi.testclient import TestClient

from tinyutils.api.convert.index import app
from tinyutils.convert.types import (
    BatchResult,
    ConversionError,
    ConversionResult,
    MediaArtifact,
    PreviewData,
    TargetArtifact,
)


client = TestClient(app)


def test_single_input_markdown_backcompat(monkeypatch):
    def fake_convert_batch(**kwargs):
        assert kwargs["targets"] == ["md"]
        result = ConversionResult(
            name="doc.docx",
            outputs=[
                TargetArtifact(
                    target="md",
                    name="doc.md",
                    content_type="text/markdown",
                    data=b"# Title",
                )
            ],
            preview=PreviewData(headings=["# Title"], snippets=[], images=[]),
            logs=["converted"],
        )
        return BatchResult(job_id="job-123", results=[result], logs=["converted"])

    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", fake_convert_batch)
    monkeypatch.setattr("tinyutils.api.convert.index.blob.upload_bytes", lambda name, data, _: f"blob://{name}")

    resp = client.post(
        "/",
        json={
            "inputs": [
                {
                    "blobUrl": "data:text/plain;base64,SGVsbG8=",
                    "name": "doc.docx",
                }
            ],
            "to": "md",
        },
        headers={"x-request-id": "req-123"},
    )

    assert resp.status_code == 200
    assert resp.headers["x-request-id"] == "req-123"
    assert resp.headers["cache-control"] == "no-store"
    payload = resp.json()
    assert payload["jobId"] == "job-123"
    assert payload["toolVersions"]["pandoc"] is not None
    assert payload["errors"] == []
    assert payload["preview"]["headings"] == ["# Title"]
    assert payload["outputs"] == [
        {"name": "doc.md", "size": 7, "blobUrl": "blob://doc.md", "target": "md"}
    ]


def test_multi_target_request(monkeypatch):
    def fake_convert_batch(**kwargs):
        assert kwargs["targets"] == ["md", "html"]
        result = ConversionResult(
            name="doc.docx",
            outputs=[
                TargetArtifact("md", "doc.md", "text/markdown", b"# Md"),
                TargetArtifact("html", "doc.html", "text/html", b"<h1>Md</h1>"),
            ],
            preview=PreviewData(headings=["# Md"], snippets=[], images=[]),
        )
        return BatchResult(job_id="job-456", results=[result], logs=["converted"])

    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", fake_convert_batch)
    monkeypatch.setattr("tinyutils.api.convert.index.blob.upload_bytes", lambda name, data, _: f"blob://{name}")

    resp = client.post(
        "/",
        json={
            "inputs": [{"blobUrl": "data:text/plain;base64,SGVsbG8=", "name": "doc.docx"}],
            "to": ["md", "html"],
            "options": {"acceptTrackedChanges": False, "extractMedia": False},
        },
    )

    payload = resp.json()
    assert payload["jobId"] == "job-456"
    assert len(payload["outputs"]) == 2
    targets = {entry["target"] for entry in payload["outputs"]}
    assert targets == {"md", "html"}


def test_multi_input_with_error(monkeypatch):
    def fake_convert_batch(**kwargs):
        result_ok = ConversionResult(
            name="good.docx",
            outputs=[TargetArtifact("md", "good.md", "text/markdown", b"good")],
            preview=PreviewData(headings=["# Good"], snippets=[], images=[]),
        )
        result_err = ConversionResult(
            name="bad.docx",
            outputs=[],
            error=ConversionError(message="boom", kind="RuntimeError"),
        )
        return BatchResult(job_id="job-789", results=[result_ok, result_err], logs=["converted"])

    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", fake_convert_batch)
    monkeypatch.setattr("tinyutils.api.convert.index.blob.upload_bytes", lambda name, data, _: f"blob://{name}")

    resp = client.post(
        "/",
        json={
            "inputs": [
                {"blobUrl": "data:text/plain;base64,R29vZA==", "name": "good.docx"},
                {"blobUrl": "data:text/plain;base64,QmFk", "name": "bad.docx"},
            ],
            "to": "md",
        },
    )

    payload = resp.json()
    assert payload["jobId"] == "job-789"
    assert len(payload["outputs"]) == 1
    assert payload["outputs"][0]["name"] == "good.md"
    assert payload["errors"] == [
        {"input": "bad.docx", "message": "boom", "kind": "RuntimeError"}
    ]
    assert payload["logs"] == ["converted"]


def test_media_outputs_are_included(monkeypatch):
    def fake_convert_batch(**kwargs):
        result = ConversionResult(
            name="doc.docx",
            outputs=[],
            media=MediaArtifact(
                name="doc-media.zip",
                content_type="application/zip",
                data=b"zip",
            ),
            preview=PreviewData(headings=[], snippets=[], images=[{"src": "img"}]),
            logs=["media"],
        )
        return BatchResult(job_id="job-media", results=[result], logs=["media"])

    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", fake_convert_batch)
    monkeypatch.setattr(
        "tinyutils.api.convert.index.blob.upload_bytes",
        lambda name, data, _: f"blob://{name}",
    )

    resp = client.post(
        "/",
        json={
            "inputs": [
                {
                    "blobUrl": "data:text/plain;base64,SGVsbG8=",
                    "name": "doc.docx",
                }
            ],
            "to": "md",
            "options": {"extractMedia": True},
        },
    )

    payload = resp.json()
    assert payload["outputs"] == [
        {"name": "doc-media.zip", "size": 3, "blobUrl": "blob://doc-media.zip", "target": "media"}
    ]
    assert payload["preview"]["images"] == [{"src": "img"}]


def test_generates_request_id_when_missing(monkeypatch):
    def fake_convert_batch(**kwargs):
        result = ConversionResult(
            name="doc.docx",
            outputs=[TargetArtifact("md", "doc.md", "text/markdown", b"# Hi")],
            preview=PreviewData(headings=["# Hi"], snippets=[], images=[]),
        )
        return BatchResult(job_id="job-321", results=[result], logs=["converted"])

    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", fake_convert_batch)
    monkeypatch.setattr(
        "tinyutils.api.convert.index.blob.upload_bytes",
        lambda name, data, _: f"blob://{name}",
    )

    resp = client.post(
        "/",
        json={
            "inputs": [
                {
                    "blobUrl": "data:text/plain;base64,SGVsbG8=",
                    "name": "doc.docx",
                }
            ],
            "to": "md",
        },
    )

    assert resp.status_code == 200
    assert resp.headers["x-request-id"]
    assert resp.headers["cache-control"] == "no-store"

def _stub_single_result() -> BatchResult:
    artifact = TargetArtifact("md", "doc.md", "text/markdown", b"# Hi")
    result = ConversionResult(
        name="doc.docx",
        outputs=[artifact],
        preview=PreviewData(headings=["# Hi"], snippets=[], images=[]),
    )
    return BatchResult(job_id="job-blob", results=[result], logs=["converted"])


def test_outputs_use_blob_urls_with_token(monkeypatch):
    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", lambda **_: _stub_single_result())
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "token-xyz")

    captured = {}

    def fake_upload(name, data, content_type, token):  # noqa: D401
        captured["token"] = token
        captured["content_type"] = content_type
        return f"https://blob.example/{name}"

    monkeypatch.setattr(
        "tinyutils.api.convert.index.blob._upload_to_vercel_blob",
        fake_upload,
    )

    resp = client.post(
        "/",
        json={
            "inputs": [
                {
                    "blobUrl": "data:text/plain;base64,SGVsbG8=",
                    "name": "doc.docx",
                }
            ],
            "to": "md",
        },
    )

    payload = resp.json()
    assert payload["outputs"][0]["blobUrl"] == "https://blob.example/doc.md"
    assert captured["token"] == "token-xyz"
    assert captured["content_type"].startswith("text/markdown")


def test_outputs_fall_back_to_data_urls_without_token(monkeypatch):
    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", lambda **_: _stub_single_result())
    monkeypatch.delenv("BLOB_READ_WRITE_TOKEN", raising=False)

    def fail_upload(*args, **kwargs):  # noqa: D401
        raise AssertionError("blob API should not be called when token is absent")

    monkeypatch.setattr(
        "tinyutils.api.convert.index.blob._upload_to_vercel_blob",
        fail_upload,
    )

    resp = client.post(
        "/",
        json={
            "inputs": [
                {
                    "blobUrl": "data:text/plain;base64,SGVsbG8=",
                    "name": "doc.docx",
                }
            ],
            "to": "md",
        },
    )

    payload = resp.json()
    assert payload["outputs"][0]["blobUrl"].startswith("data:text/markdown;base64,")


def test_missing_inputs_returns_400():
    resp = client.post(
        "/",
        json={"inputs": []},
    )

    assert resp.status_code == 400
    assert resp.headers["x-request-id"]
    assert resp.headers["cache-control"] == "no-store"
    assert resp.json()["detail"] == "No inputs provided"
