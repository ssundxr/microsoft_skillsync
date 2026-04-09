# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS build-frontend
WORKDIR /frontend-build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Serve Application ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
ARG GITHUB_TOKEN
RUN if [ -z "$GITHUB_TOKEN" ]; then echo "ERROR: GITHUB_TOKEN build-arg is empty! Check your GitHub Secrets." && exit 1; fi
RUN echo "machine github.com login x-access-token password ${GITHUB_TOKEN}" > /root/.netrc && \
    chmod 600 /root/.netrc
RUN pip install --no-cache-dir -r requirements.txt
RUN rm /root/.netrc
RUN pip install --no-cache-dir gunicorn uvicorn

# Copy application code
COPY app/ ./app/
COPY --from=build-frontend /frontend-build/dist ./frontend/dist

# Expose port 8000 for App Service
EXPOSE 8000

# Set environment variables for production
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Start Gunicorn with Uvicorn workers
CMD gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
