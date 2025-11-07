"""Unit tests for tinyutils.convert.service."""
from __future__ import annotations

from pathlib import Path

import pytest

from tinyutils.convert import ConversionOptions, convert_batch, convert_one
from tinyutils.convert.types import InputPayload


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
