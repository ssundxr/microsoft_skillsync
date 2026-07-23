from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .config import settings


class Base(DeclarativeBase):
    pass


engine_kwargs: dict = {"future": True, "pool_pre_ping": True}

if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if settings.database_url.endswith(":memory:"):
        engine_kwargs["poolclass"] = StaticPool
else:
    # For PostgreSQL: set a short connect timeout so startup never hangs
    # waiting for an unreachable DB host (prevents Gunicorn worker crash-loop)
    engine_kwargs["connect_args"] = {"connect_timeout": 5}

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import logging
    logger = logging.getLogger("uvicorn.error")

    try:
        from .auth import hash_password
        from .models import AdminUser

        Base.metadata.create_all(bind=engine)

        with SessionLocal() as db:
            existing_admin = db.scalar(select(AdminUser).where(AdminUser.username == settings.admin_username))
            if existing_admin:
                return

            db.add(
                AdminUser(
                    username=settings.admin_username,
                    display_name=settings.admin_display_name,
                    password_hash=hash_password(settings.admin_password),
                )
            )
            db.commit()
            logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed during startup: {e}")
        logger.warning("Application will continue starting, but database operations may fail until DB connection issue is resolved.")

