"""Unit tests for tinyutils.convert.service."""
from __future__ import annotations

from pathlib import Path

import pytest

from tinyutils.convert import ConversionOptions, convert_batch, convert_one
from tinyutils.convert.types import (
    ConversionError,
    ConversionResult,
    InputPayload,
    TargetArtifact,
)


@pytest.fixture(autouse=True)
def clear_cache(monkeypatch):
    import tinyutils.convert.service as service_module

    with service_module._CACHE_LOCK:
        service_module._CACHE.clear()
    yield


@pytest.fixture(autouse=True)
def stub_pandoc(monkeypatch, tmp_path):
    """Monkeypatch pandoc helpers so tests never spawn real processes."""

    def fake_convert_to_markdown(
        source: Path,
        destination: Path,
        from_format=None,
        accept_tracked_changes=False,
        extract_media_dir: Path | None = None,
        extra_args=None,
    ) -> None:
        destination.write_text(Path(source).read_text("utf-8"), "utf-8")
        if extract_media_dir:
            extract_media_dir.mkdir(parents=True, exist_ok=True)
            sample = extract_media_dir / "media" / "image.png"
            sample.parent.mkdir(parents=True, exist_ok=True)
            sample.write_bytes(b"png-bytes")

    def fake_apply_lua_filters(source: Path, destination: Path) -> None:
        destination.write_text(Path(source).read_text("utf-8"), "utf-8")

    from tinyutils.api._lib import pandoc_runner
    import tinyutils.convert.service as service_module

    monkeypatch.setattr(pandoc_runner, "convert_to_markdown", fake_convert_to_markdown)
    monkeypatch.setattr(pandoc_runner, "apply_lua_filters", fake_apply_lua_filters)
    monkeypatch.setattr(pandoc_runner, "ensure_pandoc", lambda: None)

    def fake_render_markdown_target(cleaned_path: Path, target: str) -> bytes:
        text = cleaned_path.read_text("utf-8")
        return f"<{target}>{text}</{target}>".encode("utf-8")

    monkeypatch.setattr(service_module, "_render_markdown_target", fake_render_markdown_target)


def test_convert_one_defaults_to_markdown_only():
    payload = "# Title\n\nBody"
    result = convert_one(input_bytes=payload.encode(), name="doc.docx")

    assert result.error is None
    assert [artifact.target for artifact in result.outputs] == ["md"]
    md_artifact = result.outputs[0]
    assert md_artifact.name == "doc.md"
    assert md_artifact.data.decode("utf-8").startswith("# Title")
    assert result.preview and result.preview.headings == ["# Title"]


def test_convert_one_multi_target_reuses_markdown(tmp_path):
    text = "Hello *world*"
    result = convert_one(
        input_bytes=text.encode("utf-8"),
        name="sample.docx",
        targets=["md", "html", "txt"],
        options=ConversionOptions(remove_zero_width=False),
    )

    assert [artifact.target for artifact in result.outputs] == ["md", "html", "txt"]
    html = next(a for a in result.outputs if a.target == "html")
    assert html.content_type.startswith("text/html")
    assert html.data.decode("utf-8").startswith("<html>")
    txt = next(a for a in result.outputs if a.target == "txt")
    assert "Hello" in txt.data.decode("utf-8")


def test_convert_one_with_media_zip(monkeypatch):
    result = convert_one(
        input_bytes=b"media test",
        name="media.docx",
        options=ConversionOptions(extract_media=True),
    )

    assert result.media is not None
    assert result.media.name.endswith("-media.zip")
    assert result.media.size > 0


def test_convert_batch_aggregates_results(monkeypatch):
    inputs = [
        InputPayload(name="first.docx", data=b"one"),
        InputPayload(name="second.docx", data=b"two"),
    ]

    batch = convert_batch(inputs=inputs, targets=["md", "txt"])

    assert batch.job_id
    assert len(batch.results) == 2
    assert all(result.error is None for result in batch.results)
    assert any("first.docx" in log for log in batch.logs)
    first = batch.results[0]
    assert [artifact.target for artifact in first.outputs] == ["md", "txt"]


def test_convert_one_cache_hit(monkeypatch):
    call_count = {"convert": 0}

    def counting_convert(source: Path, destination: Path, **kwargs):  # type: ignore[override]
        call_count["convert"] += 1
        destination.write_text(Path(source).read_text("utf-8"), "utf-8")
        extract_media_dir = kwargs.get("extract_media_dir")
        if extract_media_dir:
            extract_media_dir.mkdir(parents=True, exist_ok=True)
            sample = extract_media_dir / "media" / "image.png"
            sample.parent.mkdir(parents=True, exist_ok=True)
            sample.write_bytes(b"png")

    from tinyutils.api._lib import pandoc_runner

    monkeypatch.setattr(pandoc_runner, "convert_to_markdown", counting_convert)

    payload = b"# Cached"
    first = convert_one(input_bytes=payload, name="cached.docx", targets=["md", "txt"])
    second = convert_one(input_bytes=payload, name="cached.docx", targets=["md", "txt"])

    assert call_count["convert"] == 1
    assert second.logs[-1] == "cache=hit"


def test_convert_one_cache_miss_for_different_targets(monkeypatch):
    call_count = {"convert": 0}

    def counting_convert(source: Path, destination: Path, **kwargs):  # type: ignore[override]
        call_count["convert"] += 1
        destination.write_text(Path(source).read_text("utf-8"), "utf-8")

    from tinyutils.api._lib import pandoc_runner

    monkeypatch.setattr(pandoc_runner, "convert_to_markdown", counting_convert)

    payload = b"# Cached"
    convert_one(input_bytes=payload, name="cached.docx", targets=["md"])
    convert_one(input_bytes=payload, name="cached.docx", targets=["md", "html"])

    assert call_count["convert"] == 2


def test_convert_batch_reuses_cache_with_duplicate_inputs(monkeypatch):
    from tinyutils.api._lib import pandoc_runner

    call_count = {"convert": 0}

    def counting_convert(source: Path, destination: Path, **kwargs):  # type: ignore[override]
        call_count["convert"] += 1
        destination.write_text(Path(source).read_text("utf-8"), "utf-8")

    monkeypatch.setattr(pandoc_runner, "convert_to_markdown", counting_convert)

    payloads = [
        InputPayload(name="dup.docx", data=b"cache me"),
        InputPayload(name="dup.docx", data=b"cache me"),
    ]

    convert_batch(inputs=payloads, targets=["md", "txt"])

    assert call_count["convert"] == 1


def test_convert_one_handles_missing_pandoc(monkeypatch):
    from tinyutils.api._lib import pandoc_runner

    def raise_pandoc():
        raise pandoc_runner.PandocError("not installed")

    monkeypatch.setattr(pandoc_runner, "ensure_pandoc", raise_pandoc)

    result = convert_one(input_bytes=b"Hello", name="missing.docx", targets=["md", "txt"])

    assert result.error is None
    assert [artifact.target for artifact in result.outputs] == ["md", "txt"]
    assert any(log.startswith("pandoc_unavailable=") for log in result.logs)


def test_convert_batch_collects_errors(monkeypatch):
    def fake_convert_one(**kwargs):
        name = kwargs.get("name")
        if name == "bad.docx":
            return ConversionResult(
                name=name,
                outputs=[],
                logs=["failed"],
                error=ConversionError(message="boom", kind="RuntimeError"),
            )
        return ConversionResult(
            name=name,
            outputs=[TargetArtifact("md", f"{name}.md", "text/markdown", b"good")],
            logs=["ok"],
        )

    monkeypatch.setattr("tinyutils.convert.service.convert_one", fake_convert_one)

    payloads = [
        InputPayload(name="good.docx", data=b"good"),
        InputPayload(name="bad.docx", data=b"bad"),
    ]

    batch = convert_batch(inputs=payloads, targets=["md"])

    assert batch.errors[0].message == "boom"
    assert any(log.endswith("ok") for log in batch.logs)
    assert "bad.docx:failed" in batch.logs
