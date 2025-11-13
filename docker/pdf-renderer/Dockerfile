FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core fonts-noto-color-emoji ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*
# Playwright + Chromium
RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic==2.* \
    pydantic-settings==2.* playwright==1.* pypdf==4.* \
 && playwright install --with-deps chromium
WORKDIR /app
COPY docker/pdf-renderer/service /app
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
EXPOSE 8080
ENV PORT=8080
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8080"]
