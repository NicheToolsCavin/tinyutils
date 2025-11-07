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
    )

    assert resp.status_code == 200
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
