# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS build-frontend
WORKDIR /frontend-build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Serve Application ---
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn uvicorn

# Copy application code
COPY app/ ./app/
COPY cv_analyzer_api/ ./cv_analyzer_api/
COPY --from=build-frontend /frontend-build/dist ./frontend/dist

# Expose port 8080 for App Service
EXPOSE 8080

# Set environment variables for production
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Start Gunicorn with Uvicorn workers
CMD ["gunicorn", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "--timeout", "120", "--bind", "0.0.0.0:8080", "app.main:app"]
