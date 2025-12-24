# TinyUtils Universal Document Converter for Cloud Run
# Replaces Vercel Python API while uv symlink bug persists
# https://github.com/vercel/vercel/issues/14041
#
# Build: docker build -t tinyutils-converter .
# Run:   docker run -p 8080:8080 -e BLOB_READ_WRITE_TOKEN=xxx tinyutils-converter
# Test:  curl http://localhost:8080/api/convert/health

FROM python:3.12-slim

# Environment configuration
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    TINYUTILS_LOG_LEVEL=INFO

# Install system dependencies
# - pandoc: Universal document converter
# - libreoffice-writer: For complex DOCX/ODT with colors/shapes
# - fonts: For accurate text rendering
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        pandoc \
        libreoffice-writer \
        libreoffice-common \
        fonts-dejavu-core \
        fonts-dejavu-extra \
        fonts-noto-core \
        fonts-liberation \
        fonts-freefont-ttf \
        curl \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/* \
        && rm -rf /tmp/* /var/tmp/*

# Verify pandoc installation
RUN pandoc --version

# Set up working directory
WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
# We need the full structure for imports to work
COPY convert_backend/ /app/convert_backend/
COPY api/_lib/ /app/api/_lib/
COPY api/convert/ /app/api/convert/
COPY api/bulk_replace/ /app/api/bulk_replace/
# Note: bulk-replace is copied as bulk_replace for Python import compatibility

# Copy extra API wrappers (csv_join, json_tools, pdf_extract)
COPY extra_apis/ /app/extra_apis/

# Create the main entry point
COPY entrypoint.py /app/entrypoint.py

# Create non-root user for security
RUN useradd -m -u 1000 app && \
    chown -R app:app /app && \
    mkdir -p /home/app/.config/libreoffice && \
    chown -R app:app /home/app

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/convert/health || exit 1

EXPOSE 8080

# Run with uvicorn
CMD ["python", "/app/entrypoint.py"]
