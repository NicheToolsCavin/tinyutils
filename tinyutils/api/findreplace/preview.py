"""Find & replace preview endpoint."""
from __future__ import annotations

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
    compile_expression,
    scan_text,
)
from .._lib.utils import (
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


class PreviewRequest(BaseModel):
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


@app.post("/")
def preview(request: PreviewRequest) -> dict:
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
    logger = get_logger("tinyutils.findreplace.preview")
    handler = ListLogHandler()
    logger.addHandler(handler)

    files = []
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
                    text = raw.decode(encoding, errors="replace")
                    match_count, samples = scan_text(
                        text,
                        compiled,
                        max_matches=request.maxMatchesPerFile,
                    )
                    files.append(
                        {
                            "path": meta.original_name,
                            "encoding": encoding,
                            "size": meta.size_bytes,
                            "matchCount": match_count,
                            "samples": [
                                {
                                    "line": sample.line,
                                    "match": sample.match,
                                    "contextBefore": sample.context_before,
                                    "contextAfter": sample.context_after,
                                }
                                for sample in samples
                            ],
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
                    logger.exception("preview_failed")
                    errors.append(
                        {
                            "path": item.name or "input",
                            "error": str(exc),
                        }
                    )

        return {
            "jobId": job_id,
            "files": files,
            "errors": errors,
            "logs": handler.export(),
        }
    finally:
        logger.removeHandler(handler)
