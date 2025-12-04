# Stub Dockerfile for LibreOffice conversion service (Cloud Run friendly)
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    SOFFICE_BIN=libreoffice

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer libreoffice-common \
      fonts-dejavu-core fonts-noto-core && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY main.py /app/main.py

# Create non-root user after installs
RUN useradd -m app && chown -R app /app
USER app

EXPOSE 8080
CMD ["python", "/app/main.py"]

