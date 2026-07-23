from __future__ import annotations

import shutil
import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from ..config import settings
from .sharepoint_service import upload_file_to_sharepoint, upload_bytes_to_sharepoint


def save_upload(file: UploadFile | None, folder_path: str = "RecruiterAssets") -> dict | None:
    if file is None or not file.filename:
        return None

    extension = Path(file.filename).suffix.lower() or ".bin"
    stored_name = f"{uuid4().hex}{extension}"
    destination = settings.upload_dir / stored_name

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Background task for SharePoint upload if event loop is running
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(upload_file_to_sharepoint(destination, file.filename, folder_path=folder_path))
    except RuntimeError:
        pass

    return {
        "original_name": file.filename,
        "stored_name": stored_name,
        "content_type": file.content_type,
        "url": f"/media/{stored_name}",
    }


async def save_resume_upload(file: UploadFile, folder_path: str = "CVs") -> dict:
    """
    Saves a candidate resume locally and uploads directly to SharePoint.
    Returns dictionary with local media URL, SharePoint ID, and SharePoint web URL.
    """
    extension = Path(file.filename or "resume.pdf").suffix.lower() or ".pdf"
    stored_name = f"{uuid4().hex}{extension}"
    destination = settings.upload_dir / stored_name

    content = await file.read()
    with destination.open("wb") as buffer:
        buffer.write(content)

    sharepoint_meta = await upload_bytes_to_sharepoint(
        content=content,
        original_filename=file.filename or stored_name,
        folder_path=folder_path,
    )

    sharepoint_id = sharepoint_meta.get("sharepoint_id") if sharepoint_meta else None
    sharepoint_web_url = sharepoint_meta.get("sharepoint_web_url") if sharepoint_meta else None
    download_url = sharepoint_meta.get("download_url") if sharepoint_meta else None

    # Resume URL prioritizes SharePoint web URL if available, otherwise local URL
    resume_url = sharepoint_web_url or download_url or f"/media/{stored_name}"

    return {
        "original_name": file.filename,
        "stored_name": stored_name,
        "content_type": file.content_type,
        "url": f"/media/{stored_name}",
        "resume_url": resume_url,
        "sharepoint_id": sharepoint_id,
        "sharepoint_web_url": sharepoint_web_url,
    }
