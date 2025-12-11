FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Install MAXIMUM font coverage for universal document conversion:
# Core fonts:
# - fonts-dejavu: Full Unicode including IPA, Greek, Cyrillic, math symbols
# - fonts-liberation: Metric-compatible replacements for Times, Arial, Courier
# - fonts-crosextra-*: Calibri (Carlito) and Cambria (Caladea) replacements
# - fonts-freefont-ttf: GNU FreeFont with extensive Unicode coverage
# Noto family (Google's "No Tofu" project - covers ALL Unicode scripts):
# - fonts-noto: Base Noto fonts
# - fonts-noto-core: Core Latin + common scripts
# - fonts-noto-extra: Extended scripts (Tibetan, Myanmar, Khmer, etc.)
# - fonts-noto-cjk: Chinese, Japanese, Korean
# - fonts-noto-cjk-extra: Additional CJK variants
# - fonts-noto-color-emoji: Color emoji
# - fonts-noto-mono: Monospace
# Additional coverage:
# - fonts-symbola: Ancient scripts, rare symbols, mathematical
# - fonts-sil-*: SIL linguistics fonts (Charis, Doulos, Gentium)
# - fonts-lohit-*: Indic scripts (Hindi, Tamil, Bengali, etc.)
# - fonts-khmeros: Khmer script
# - fonts-tibetan-machine: Tibetan script
# - fonts-thai-tlwg: Thai script
# - fonts-arabeyes: Arabic script variants
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu \
    fonts-liberation \
    fonts-crosextra-carlito \
    fonts-crosextra-caladea \
    fonts-freefont-ttf \
    fonts-noto \
    fonts-noto-core \
    fonts-noto-extra \
    fonts-noto-cjk \
    fonts-noto-cjk-extra \
    fonts-noto-color-emoji \
    fonts-noto-mono \
    fonts-symbola \
    fonts-sil-charis \
    fonts-sil-doulos \
    fonts-sil-gentiumplus \
    fonts-lohit-deva \
    fonts-lohit-taml \
    fonts-lohit-beng-assamese \
    fonts-lohit-gujr \
    fonts-lohit-knda \
    fonts-lohit-mlym \
    fonts-lohit-orya \
    fonts-lohit-guru \
    fonts-lohit-telu \
    fonts-khmeros \
    fonts-tibetan-machine \
    fonts-thai-tlwg \
    fonts-arabeyes \
    fonts-arphic-ukai \
    fonts-arphic-uming \
    fonts-ipafont-gothic \
    fonts-ipafont-mincho \
    fonts-baekmuk \
    fonts-unfonts-core \
    ca-certificates wget fontconfig \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f -v
# Playwright + Chromium
RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic==2.* \
    pydantic-settings==2.* playwright==1.* pypdf==4.* \
 && playwright install --with-deps chromium
WORKDIR /app
COPY service /app
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
EXPOSE 8080
ENV PORT=8080
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8080"]
