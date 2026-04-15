# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build frontend ----------
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---------- Stage 2: python runtime ----------
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System libs needed by opencv-python-headless / onnxruntime / easyocr
RUN apt-get update && apt-get install -y --no-install-recommends \
      libglib2.0-0 \
      libgl1 \
      libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend sources
COPY server/ ./server/
COPY run.py ./

# Built frontend from stage 1
COPY --from=client-build /app/client/dist ./client/dist

# Runtime dirs (models/data/uploads are expected as mounted volumes in prod)
RUN mkdir -p /app/models /app/data /app/server/uploads

EXPOSE 8000

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
