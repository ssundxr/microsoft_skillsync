from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str
    secret_key: str
    database_url: str
    upload_dir: Path
    admin_username: str
    admin_password: str
    admin_display_name: str
    session_cookie_name: str = "skillsync_admin"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    db_host: str = ""
    db_port: str = ""
    db_name: str = ""
    db_user: str = ""
    db_password: str = ""
    google_client_id: str = ""
    gemini_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    # Check for Azure/Docker data volume at /data
    data_mount = Path("/data")
    is_container = data_mount.exists()
    
    default_upload = data_mount / "uploads" if is_container else BASE_DIR / "uploads"
    default_db = f"sqlite:///{(data_mount / 'assessment_recruiter.db').as_posix()}" if is_container else f"sqlite:///{(BASE_DIR / 'assessment_recruiter.db').as_posix()}"

    db_host = os.getenv("DB_HOST", "")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "")
    db_user = os.getenv("DB_USER", "")
    db_password = os.getenv("DB_PASSWORD", "")

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url and db_host and db_user and db_name:
        db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    elif not db_url:
        db_url = default_db

    # Standardize postgres:// to postgresql:// for SQLAlchemy
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    upload_dir = Path(os.getenv("UPLOAD_DIR", default_upload)).resolve()
    return Settings(
        app_name=os.getenv("APP_NAME", "SkillSync Assessment Recruiter"),

        secret_key=os.getenv("SECRET_KEY", "dev-secret-key-change-me"),
        database_url=db_url,
        upload_dir=upload_dir,
        admin_username=os.getenv("ADMIN_USERNAME", "admin"),
        admin_password=os.getenv("ADMIN_PASSWORD", "Admin@123"),
        admin_display_name=os.getenv("ADMIN_DISPLAY_NAME", "Assessment Admin"),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        db_host=db_host,
        db_port=db_port,
        db_name=db_name,
        db_user=db_user,
        db_password=db_password,
        google_client_id=os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", ""),
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
    )


settings = get_settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)

