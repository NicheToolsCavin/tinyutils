"""Find & replace apply endpoint."""
from __future__ import annotations

import difflib
from pathlib import Path
from typing import List, Optional

import chardet
import magic
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .._lib import blob
from .._lib.regex_tools import (
    RegexTimeoutError,
    TooManyMatchesError,
    apply_replacement,
    compile_expression,
)
from .._lib.utils import (
    DIFF_TRUNCATE_KB,
    DownloadMetadata,
    ListLogHandler,
    ensure_within_limits,
    generate_job_id,
    get_logger,
    job_workspace,
)


app = FastAPI()


class InputItem(BaseModel):
    blobUrl: str
    name: Optional[str] = None


class ApplyRequest(BaseModel):
    inputs: List[InputItem]
    pattern: str
    replacement: str = ""
    mode: str = Field("regex", regex="^(regex|literal)$")
    multiline: bool = False
    caseSensitive: bool = True
    wholeWord: bool = False
    includeGlobs: List[str] = []
    excludeGlobs: List[str] = []
    maxMatchesPerFile: int = Field(default=50000, ge=1)
    createBackup: bool = False


def _download(item: InputItem, workdir: Path) -> DownloadMetadata:
    target = workdir / (item.name or "input.txt")
    size, content_type = blob.download_to_path(item.blobUrl, target)
    ensure_within_limits(size)
    mime = content_type or magic.from_file(str(target), mime=True)
    return DownloadMetadata(
        path=target,
        size_bytes=size,
        content_type=mime,
        original_name=target.name,
    )


def _detect_encoding(data: bytes) -> str:
    result = chardet.detect(data)
    encoding = result.get("encoding") or "utf-8"
    return encoding


def _diff(original: str, updated: str, name: str) -> str:
    diff = difflib.unified_diff(
        original.splitlines(),
        updated.splitlines(),
        fromfile=f"a/{name}",
        tofile=f"b/{name}",
        lineterm="",
    )
    joined = "\n".join(diff)
    limit = DIFF_TRUNCATE_KB * 1024
    if len(joined.encode("utf-8")) > limit:
        return joined[: limit // 2] + "\n... diff truncated ..."
    return joined


@app.post("/")
def apply(request: ApplyRequest) -> dict:
    if not request.inputs:
        raise HTTPException(status_code=400, detail="No inputs provided")

    compiled = compile_expression(
        request.pattern,
        mode=request.mode,
        multiline=request.multiline,
        case_sensitive=request.caseSensitive,
        whole_word=request.wholeWord,
    )

    job_id = generate_job_id()
    logger = get_logger("tinyutils.findreplace.apply")
    handler = ListLogHandler()
    logger.addHandler(handler)

    outputs = []
    diffs = []
    errors = []

    try:
        with job_workspace() as workdir:
            for item in request.inputs:
                try:
                    meta = _download(item, workdir)
                    if meta.content_type and not meta.content_type.startswith("text"):
                        errors.append(
                            {
                                "path": meta.original_name,
                                "error": "binary_file_skipped",
                            }
                        )
                        continue
                    raw = meta.path.read_bytes()
                    encoding = _detect_encoding(raw)
                    original = raw.decode(encoding, errors="replace")
                    updated, replacements = apply_replacement(
                        original,
                        compiled,
                        request.replacement,
                        max_matches=request.maxMatchesPerFile,
                    )
                    if replacements == 0:
                        continue

                    output_name = meta.original_name or "output.txt"
                    output_bytes = updated.encode(encoding)
                    url = blob.upload_bytes(output_name, output_bytes, "text/plain")
                    outputs.append(
                        {
                            "path": output_name,
                            "size": len(output_bytes),
                            "blobUrl": url,
                        }
                    )
                    diffs.append(
                        {
                            "path": output_name,
                            "unified": _diff(original, updated, output_name),
                        }
                    )
                except (RegexTimeoutError, TooManyMatchesError) as exc:
                    errors.append(
                        {
                            "path": item.name or "input",
                            "error": str(exc),
                        }
                    )
                except Exception as exc:  # pragma: no cover - diagnostics
                    logger.exception("apply_failed")
                    errors.append(
                        {
                            "path": item.name or "input",
                            "error": str(exc),
                        }
                    )

        return {
            "jobId": job_id,
            "outputs": outputs,
            "diffs": diffs,
            "errors": errors,
            "logs": handler.export(),
        }
    finally:
        logger.removeHandler(handler)
