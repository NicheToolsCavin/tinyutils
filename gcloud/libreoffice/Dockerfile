# LibreOffice Conversion Service for Cloud Run
# Converts documents (DOCX, ODT, RTF) to HTML/PDF with style preservation
#
# Build: docker build -t tinyutils-libreoffice .
# Run:   docker run -p 8080:8080 tinyutils-libreoffice
# Test:  curl http://localhost:8080/health

FROM python:3.12-slim

# Environment configuration
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    SOFFICE_BIN=libreoffice \
    LIBREOFFICE_TIMEOUT_SECONDS=120 \
    MAX_FILE_SIZE_MB=50

# Install LibreOffice and dependencies
# - libreoffice-writer: Word processing (DOCX, ODT, RTF)
# - libreoffice-calc: Spreadsheets (for future use)
# - fonts-*: Common fonts for accurate rendering
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libreoffice-writer \
        libreoffice-calc \
        libreoffice-common \
        fonts-dejavu-core \
        fonts-dejavu-extra \
        fonts-noto-core \
        fonts-liberation \
        fonts-freefont-ttf \
        # Clean up
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/* \
        && rm -rf /tmp/* /var/tmp/*

# Set up working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py /app/main.py

# Create non-root user for security
RUN useradd -m -u 1000 app && \
    chown -R app:app /app && \
    # LibreOffice needs a home directory for config
    mkdir -p /home/app/.config/libreoffice && \
    chown -R app:app /home/app

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

EXPOSE 8080

# Run the service
CMD ["python", "/app/main.py"]
