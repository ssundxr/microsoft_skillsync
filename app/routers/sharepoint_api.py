from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from ..auth import require_admin_api
from ..schemas import SharePointFileItem, SharePointStatusResponse
from ..services.sharepoint_service import (
    delete_sharepoint_file,
    get_sharepoint_sharing_link,
    get_sharepoint_status,
    list_sharepoint_files,
    upload_bytes_to_sharepoint,
)

router = APIRouter(prefix="/api/sharepoint", tags=["sharepoint"])


@router.get("/status", response_model=SharePointStatusResponse)
async def sharepoint_status(_: Any = Depends(require_admin_api)):
    """Check connection, tenant details, and Microsoft Graph token acquisition status."""
    status_info = await get_sharepoint_status()
    return SharePointStatusResponse(**status_info)


@router.get("/files", response_model=dict[str, list[SharePointFileItem]])
async def get_sharepoint_files(
    folder: str = Query("CVs", description="Folder path in SharePoint drive"),
    _: Any = Depends(require_admin_api),
):
    """List files in a designated SharePoint folder."""
    files = await list_sharepoint_files(folder_path=folder)
    items = [SharePointFileItem(**f) for f in files]
    return {"items": items}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_to_sharepoint(
    file: UploadFile = File(...),
    folder: str = Form("CVs"),
    _: Any = Depends(require_admin_api),
):
    """Upload a file directly to Microsoft SharePoint Document Library."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    result = await upload_bytes_to_sharepoint(
        content=content, original_filename=file.filename, folder_path=folder
    )

    if not result:
        # Save local fallback or return detailed message
        raise HTTPException(
            status_code=502,
            detail="Failed to upload file to SharePoint. Please check Azure AD credentials and SharePoint configuration.",
        )

    return {
        "message": f"Successfully uploaded '{file.filename}' to SharePoint folder '{folder}'.",
        "file": result,
    }


@router.get("/link/{item_id}")
async def get_item_link(
    item_id: str,
    link_type: str = Query("view", description="Link type: view or edit"),
    _: Any = Depends(require_admin_api),
):
    """Generate a shareable preview/download link for a SharePoint drive item."""
    link = await get_sharepoint_sharing_link(item_id, link_type=link_type)
    if not link:
        raise HTTPException(status_code=404, detail="Unable to create sharing link or item not found.")
    return {"item_id": item_id, "shareable_link": link}


@router.delete("/files/{item_id}")
async def remove_sharepoint_file(
    item_id: str,
    _: Any = Depends(require_admin_api),
):
    """Delete a file from SharePoint Document Library."""
    success = await delete_sharepoint_file(item_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete file from SharePoint.")
    return {"message": "File deleted successfully from SharePoint."}
