from __future__ import annotations

import os
import socket

# Force IPv4 DNS resolution for cloud environments (like Azure App Service) without IPv6 outbound routing
_orig_getaddrinfo = socket.getaddrinfo
def _getaddrinfo_ipv4(*args, **kwargs):
    responses = _orig_getaddrinfo(*args, **kwargs)
    ipv4_responses = [r for r in responses if r[0] == socket.AF_INET]
    return ipv4_responses if ipv4_responses else responses
socket.getaddrinfo = _getaddrinfo_ipv4

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .config import BASE_DIR, settings
from .database import init_db
from .routers import api, auth

# Initialize Datasette for visual DB exploration if using SQLite
ds = None
if settings.database_url.startswith("sqlite"):
    from datasette.app import Datasette
    db_path = settings.database_url.replace("sqlite:///", "")
    if not db_path.startswith("/") and ":" not in db_path:
        db_path_abs = str(BASE_DIR / db_path)
    else:
        db_path_abs = db_path

    ds = Datasette(
        [db_path_abs],
        settings={
            "base_url": "/db-explorer/",
            "template_debug": True if not os.getenv("PROD") else False
        }
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    init_db()
    yield

app = FastAPI(
    title="SkillSync Assessment Recruiter API",
    description="Recruiter portal for job posting and AI-powered assessment generation",
    version="0.2.0",
    lifespan=lifespan,
)


@app.get("/healthz", include_in_schema=False)
async def health_check():
    db_status = "ok"
    try:
        from sqlalchemy import text
        from .database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {"status": "ok", "database": db_status}

# ── Database Explorer (Native ASGI Mount) ───────────────────────────────
if ds:
    app.mount("/db-explorer", ds.app())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    session_cookie=settings.session_cookie_name,
    same_site="lax",
    https_only=False,
)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "app" / "static")), name="static")
app.mount("/media", StaticFiles(directory=str(settings.upload_dir)), name="media")

app.include_router(auth.router)
app.include_router(api.router)

from .routers import candidate_auth, candidate_api
app.include_router(candidate_auth.router)
app.include_router(candidate_api.router)

from cv_analyzer_api.router import router as cv_analyzer_router
app.include_router(cv_analyzer_router)

# Serve React SPA as the primary frontend.
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react_app(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        
        # If it's a request for an asset that doesn't exist, return 404 instead of index.html
        if full_path.startswith("assets/") or full_path.startswith("static/"):
            raise HTTPException(status_code=404, detail="Asset not found")

        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return HTMLResponse(
            "<h1 style='font-family:monospace'>SkillSync API running</h1>"
            "<p>Build the frontend first:<br>"
            "<code>cd frontend && npm install && npm run build</code></p>"
            "<p><a href='/docs'>API Docs →</a></p>"
        )
