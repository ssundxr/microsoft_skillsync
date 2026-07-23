from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional
import httpx

from ..config import settings

logger = logging.getLogger(__name__)

GRAPH_SCOPE = ["https://graph.microsoft.com/.default"]
GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
REQUEST_TIMEOUT = 30.0  # Timeout for file uploads


async def get_graph_access_token() -> Optional[str]:
    """
    Acquires an Azure AD access token for Microsoft Graph API using Client Credentials flow.
    Uses SHAREPOINT_* or POWERBI_* client configuration settings.
    """
    client_id = os.getenv("SHAREPOINT_CLIENT_ID") or getattr(settings, "powerbi_client_id", os.getenv("POWERBI_CLIENT_ID", ""))
    client_secret = os.getenv("SHAREPOINT_CLIENT_SECRET") or getattr(settings, "powerbi_client_secret", os.getenv("POWERBI_CLIENT_SECRET", ""))
    tenant_id = os.getenv("SHAREPOINT_TENANT_ID") or getattr(settings, "powerbi_tenant_id", os.getenv("POWERBI_TENANT_ID", ""))

    if not client_id or not client_secret or not tenant_id:
        logger.warning("Azure AD credentials missing. SharePoint operations skipped.")
        return None

    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://graph.microsoft.com/.default",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(token_url, data=payload)
            res.raise_for_status()
            data = res.json()
            return data.get("access_token")
    except Exception as exc:
        logger.error(f"Failed to acquire Microsoft Graph access token: {exc}")
        return None


def _get_base_drive_url(folder_path: str = "") -> str:
    """Helper to resolve Graph API endpoint URL for drive root or site/drive."""
    site_id = os.getenv("SHAREPOINT_SITE_ID", "").strip()
    drive_id = os.getenv("SHAREPOINT_DRIVE_ID", "").strip()

    if site_id and drive_id:
        base = f"{GRAPH_API_BASE}/sites/{site_id}/drives/{drive_id}/root"
    elif site_id:
        base = f"{GRAPH_API_BASE}/sites/{site_id}/drive/root"
    else:
        base = f"{GRAPH_API_BASE}/drive/root"

    if folder_path:
        clean_path = folder_path.strip("/")
        return f"{base}:/{clean_path}"
    return base


async def upload_bytes_to_sharepoint(
    content: bytes, original_filename: str, folder_path: str = "CVs"
) -> Optional[Dict[str, Any]]:
    """
    Uploads raw file bytes to SharePoint via Microsoft Graph API.
    Returns SharePoint file metadata dictionary or None if failed.
    """
    token = await get_graph_access_token()
    if not token:
        logger.info("SharePoint integration disabled or not configured. File stored locally only.")
        return None

    base_url = _get_base_drive_url(folder_path)
    upload_url = f"{base_url}/{original_filename}:/content"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/octet-stream",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.put(upload_url, headers=headers, content=content)
            if response.status_code in (200, 201):
                data = response.json()
                web_url = data.get("webUrl", "")
                download_url = data.get("@microsoft.graph.downloadUrl", web_url)
                file_id = data.get("id", "")
                logger.info(f"Successfully uploaded {original_filename} to SharePoint: {web_url}")
                return {
                    "sharepoint_id": file_id,
                    "sharepoint_web_url": web_url,
                    "download_url": download_url,
                    "name": data.get("name"),
                    "size": data.get("size"),
                    "folder": folder_path,
                }
            else:
                logger.error(f"SharePoint upload HTTP error {response.status_code}: {response.text}")
                return None
    except Exception as exc:
        logger.error(f"SharePoint upload exception: {exc}")
        return None


async def upload_file_to_sharepoint(
    file_path: Path | str, original_filename: str, folder_path: str = "CVs"
) -> Optional[Dict[str, Any]]:
    """
    Uploads a local file to SharePoint via Microsoft Graph API.
    Returns SharePoint file metadata or None if skipped/failed.
    """
    try:
        file_bytes = Path(file_path).read_bytes()
        return await upload_bytes_to_sharepoint(file_bytes, original_filename, folder_path)
    except Exception as exc:
        logger.error(f"Failed to read file for SharePoint upload: {exc}")
        return None


async def list_sharepoint_files(folder_path: str = "CVs") -> list[Dict[str, Any]]:
    """
    Lists files inside a SharePoint folder via Graph API.
    """
    token = await get_graph_access_token()
    if not token:
        return []

    base_url = _get_base_drive_url(folder_path)
    children_url = f"{base_url}:/children" if folder_path else f"{base_url}/children"

    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(children_url, headers=headers)
            if res.status_code == 200:
                items = res.json().get("value", [])
                results = []
                for item in items:
                    if "file" in item:
                        results.append(
                            {
                                "id": item.get("id"),
                                "name": item.get("name"),
                                "size": item.get("size", 0),
                                "web_url": item.get("webUrl"),
                                "download_url": item.get("@microsoft.graph.downloadUrl", item.get("webUrl")),
                                "created_at": item.get("createdDateTime"),
                                "folder": folder_path,
                            }
                        )
                return results
            else:
                logger.warning(f"Failed to list SharePoint files HTTP {res.status_code}: {res.text}")
                return []
    except Exception as exc:
        logger.error(f"SharePoint list exception: {exc}")
        return []


async def get_sharepoint_sharing_link(item_id: str, link_type: str = "view") -> Optional[str]:
    """
    Generates a shareable preview/download link for a SharePoint drive item.
    """
    token = await get_graph_access_token()
    if not token or not item_id:
        return None

    site_id = os.getenv("SHAREPOINT_SITE_ID", "").strip()
    drive_id = os.getenv("SHAREPOINT_DRIVE_ID", "").strip()

    if site_id and drive_id:
        url = f"{GRAPH_API_BASE}/sites/{site_id}/drives/{drive_id}/items/{item_id}/createLink"
    else:
        url = f"{GRAPH_API_BASE}/drive/items/{item_id}/createLink"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {"type": link_type, "scope": "anonymous"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code in (200, 201):
                data = res.json()
                return data.get("link", {}).get("webUrl")
            else:
                logger.warning(f"Failed to create SharePoint sharing link HTTP {res.status_code}: {res.text}")
                return None
    except Exception as exc:
        logger.error(f"SharePoint createLink exception: {exc}")
        return None


async def delete_sharepoint_file(item_id: str) -> bool:
    """
    Deletes a file item from SharePoint drive by item_id.
    """
    token = await get_graph_access_token()
    if not token or not item_id:
        return False

    site_id = os.getenv("SHAREPOINT_SITE_ID", "").strip()
    drive_id = os.getenv("SHAREPOINT_DRIVE_ID", "").strip()

    if site_id and drive_id:
        url = f"{GRAPH_API_BASE}/sites/{site_id}/drives/{drive_id}/items/{item_id}"
    else:
        url = f"{GRAPH_API_BASE}/drive/items/{item_id}"

    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.delete(url, headers=headers)
            return res.status_code in (200, 204)
    except Exception as exc:
        logger.error(f"SharePoint delete exception: {exc}")
        return False


async def get_sharepoint_status() -> dict:
    """
    Returns current configuration and connectivity status of SharePoint integration.
    """
    client_id = os.getenv("SHAREPOINT_CLIENT_ID") or getattr(settings, "powerbi_client_id", os.getenv("POWERBI_CLIENT_ID", ""))
    tenant_id = os.getenv("SHAREPOINT_TENANT_ID") or getattr(settings, "powerbi_tenant_id", os.getenv("POWERBI_TENANT_ID", ""))
    site_id = os.getenv("SHAREPOINT_SITE_ID", "")
    drive_id = os.getenv("SHAREPOINT_DRIVE_ID", "")
    folder_path = os.getenv("SHAREPOINT_FOLDER_PATH", "CVs")

    configured = bool(client_id and tenant_id)
    token = await get_graph_access_token() if configured else None
    token_acquired = bool(token)

    message = (
        "SharePoint connection active and Microsoft Graph token acquired successfully."
        if token_acquired
        else "SharePoint Graph API credentials missing or invalid."
    )

    return {
        "configured": configured,
        "tenant_id": tenant_id[:8] + "..." if tenant_id else None,
        "client_id": client_id[:8] + "..." if client_id else None,
        "site_id": site_id,
        "drive_id": drive_id,
        "folder_path": folder_path,
        "token_acquired": token_acquired,
        "message": message,
    }
