"""Unit tests for the convert() handler without HTTPX dependencies."""
from __future__ import annotations

import pytest
from fastapi import HTTPException

from tinyutils.api.convert.index import ConvertRequest, InputItem, convert
from tinyutils.convert.types import (
    BatchResult,
    ConversionError,
    ConversionResult,
    InputPayload,
    PreviewData,
    TargetArtifact,
)


def _patch_download(monkeypatch, payloads):
    monkeypatch.setattr(
        "tinyutils.api.convert.index._download_payloads",
        lambda inputs, workdir: payloads,
    )


def _patch_blob(monkeypatch):
    monkeypatch.setattr(
        "tinyutils.api.convert.index.blob.upload_bytes",
        lambda name, data, content_type: f"blob://{name}",
    )


def test_convert_single_md(monkeypatch):
    _patch_blob(monkeypatch)
    _patch_download(monkeypatch, [InputPayload(name="doc.docx", data=b"doc")])

    def fake_convert_batch(**kwargs):
        result = ConversionResult(
            name="doc.docx",
            outputs=[TargetArtifact("md", "doc.md", "text/markdown", b"# Hi")],
            preview=PreviewData(headings=["# Hi"], snippets=[], images=[]),
            logs=["converted"],
        )
        return BatchResult(job_id="job-1", results=[result], logs=["converted"])

    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", fake_convert_batch)

    request = ConvertRequest(inputs=[InputItem(blobUrl="data:text/plain;base64,SC0=", name="doc.docx")], to="md")
    response = convert(request)

    assert response["jobId"] == "job-1"
    assert response["errors"] == []
    assert response["preview"]["headings"] == ["# Hi"]
    assert response["outputs"] == [
        {"name": "doc.md", "size": 4, "blobUrl": "blob://doc.md", "target": "md"}
    ]


def test_convert_multi_target_outputs(monkeypatch):
    _patch_blob(monkeypatch)
    _patch_download(monkeypatch, [InputPayload(name="doc.docx", data=b"doc")])

    def fake_convert_batch(**kwargs):
        assert kwargs["targets"] == ["md", "html"]
        result = ConversionResult(
            name="doc.docx",
            outputs=[
                TargetArtifact("md", "doc.md", "text/markdown", b"md"),
                TargetArtifact("html", "doc.html", "text/html", b"<p>md</p>"),
            ],
            preview=PreviewData(headings=["# Doc"], snippets=[], images=[]),
        )
        return BatchResult(job_id="job-2", results=[result], logs=["converted"])

    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", fake_convert_batch)

    request = ConvertRequest(
        inputs=[InputItem(blobUrl="data:text/plain;base64,SC0=", name="doc.docx")],
        to=["md", "html"],
    )
    response = convert(request)

    assert response["jobId"] == "job-2"
    assert {entry["target"] for entry in response["outputs"]} == {"md", "html"}


def test_convert_invalid_target_raises(monkeypatch):
    _patch_blob(monkeypatch)
    _patch_download(monkeypatch, [InputPayload(name="doc.docx", data=b"doc")])

    def fake_convert_batch(**kwargs):
        raise ValueError("Unsupported target xyz")

    monkeypatch.setattr("tinyutils.api.convert.index.convert_batch", fake_convert_batch)

    request = ConvertRequest(
        inputs=[InputItem(blobUrl="data:text/plain;base64,SC0=", name="doc.docx")],
        to="xyz",
    )

    with pytest.raises(HTTPException) as exc:
        convert(request)

    assert exc.value.status_code == 400
    assert "Unsupported target" in exc.value.detail
