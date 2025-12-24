#!/usr/bin/env python3
"""Cloud Run entry point for TinyUtils Converter + Bulk Replace.

This creates a combined FastAPI app that mounts:
- /api/convert/* -> convert_backend.app
- /api/bulk-replace -> bulk_replace.index

This allows a single Cloud Run service to handle both endpoints.
"""
import os
import sys

# Ensure app directory is in Python path
sys.path.insert(0, "/app")

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the main combined app
main_app = FastAPI(title="TinyUtils API", description="Combined Converter + Bulk Replace API")

# Add CORS for cross-origin requests from tinyutils.net
main_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tinyutils.net",
        "https://www.tinyutils.net",
        "https://tinyutils.vercel.app",
        "http://localhost:5173",  # SvelteKit dev
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the convert app
from convert_backend.app import app as convert_app
main_app.mount("/api/convert", convert_app)

# Mount the bulk-replace app
from api.bulk_replace.index import app as bulk_replace_app
main_app.mount("/api/bulk-replace", bulk_replace_app)

# Health check at root
@main_app.get("/")
@main_app.get("/health")
async def health():
    return {"status": "ok", "service": "tinyutils-combined", "endpoints": ["/api/convert", "/api/bulk-replace"]}


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"[tinyutils-converter] Starting combined API on {host}:{port}", file=sys.stderr)
    print(f"  - /api/convert/* -> convert_backend.app", file=sys.stderr)
    print(f"  - /api/bulk-replace -> bulk_replace.index", file=sys.stderr)

    uvicorn.run(
        main_app,
        host=host,
        port=port,
        log_level="info",
        # Cloud Run handles HTTPS termination
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
