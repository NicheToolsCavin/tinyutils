"""Lightweight bootstrap for the convert lambda."""
from __future__ import annotations

import sys
import traceback
from typing import Any, Awaitable, Callable


try:
    from convert_backend.app import (  # pragma: no cover - Vercel entrypoint
        ConvertRequest,
        InputItem,
        Options,
        convert_batch,
        _download_payloads,
        blob as _blob,
        app,
        convert,
    )
    blob = _blob
except Exception:  # pragma: no cover - surface import-time failures
    trace = traceback.format_exc()
    sys.stderr.write("[tinyutils] convert bootstrap failed during app import\n")
    sys.stderr.write(trace)
    sys.stderr.flush()

    async def _import_error_app(
        scope: dict,
        receive: Callable[[], Awaitable[Any]],
        send: Callable[[dict], Awaitable[Any]],
    ) -> None:
        if scope.get("type") != "http":
            raise
        body = ("Import failure in convert lambda:\n" + trace).encode("utf-8", errors="replace")
        await send(
            {
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"text/plain; charset=utf-8")],
            }
        )
        await send({"type": "http.response.body", "body": body})

    def _import_error_callable(*_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        raise RuntimeError("convert app import failed; see logs above")

    app = _import_error_app
    ConvertRequest = _import_error_callable  # type: ignore
    InputItem = _import_error_callable  # type: ignore
    Options = _import_error_callable  # type: ignore
    convert = _import_error_callable  # type: ignore
    blob = _import_error_callable  # type: ignore
    _download_payloads = _import_error_callable  # type: ignore
    convert_batch = _import_error_callable  # type: ignore


__all__ = [
    "app",
    "ConvertRequest",
    "InputItem",
    "Options",
    "convert",
    "blob",
    "_download_payloads",
    "convert_batch",
]
