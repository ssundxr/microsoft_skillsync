from __future__ import annotations

import logging
from typing import Any, Dict
import httpx
from fastapi import HTTPException, status

from ..config import settings

logger = logging.getLogger(__name__)

# Scope for PowerBI REST API authentication
POWERBI_SCOPE = ["https://analysis.windows.net/powerbi/api/.default"]
POWERBI_API_BASE = "https://api.powerbi.com/v1.0/myorg"
REQUEST_TIMEOUT = 10.0  # 10 second timeout for upstream HTTP requests


async def get_azure_ad_token() -> str:
    """
    Acquire Azure AD access token for PowerBI API using Client Credentials flow.
    Supports MSAL if installed, with httpx fallback.
    """
    client_id = settings.powerbi_client_id
    client_secret = settings.powerbi_client_secret
    tenant_id = settings.powerbi_tenant_id

    if not client_id or not client_secret or not tenant_id:
        logger.error("PowerBI configuration missing in environment settings.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PowerBI service configuration is incomplete on the server."
        )

    # Check if MSAL is installed
    try:
        import msal
    except ImportError:
        msal = None

    if msal is not None:
        try:
            authority = f"https://login.microsoftonline.com/{tenant_id}"
            app = msal.ConfidentialClientApplication(
                client_id,
                authority=authority,
                client_credential=client_secret
            )
            result = app.acquire_token_for_client(scopes=POWERBI_SCOPE)
            if "access_token" in result:
                return result["access_token"]
            
            error_desc = result.get("error_description", "Unknown MSAL error")
            logger.error("MSAL token acquisition failed.")
            if "invalid_client" in error_desc or "unauthorized" in error_desc.lower():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Azure AD authentication failed: Invalid credentials."
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to authenticate with Azure AD."
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Unexpected error in MSAL token acquisition.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to authenticate with Azure AD."
            ) from exc

    # Fallback to direct OAuth token request using httpx
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://analysis.windows.net/powerbi/api/.default"
    }
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            res = await client.post(token_url, data=payload)
            if res.status_code == 401 or res.status_code == 403:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Azure AD authentication failed."
                )
            res.raise_for_status()
            data = res.json()
            return data["access_token"]
    except httpx.TimeoutException:
        logger.error("Azure AD token request timed out.")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Azure AD authentication service timed out."
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Azure AD direct token request failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to acquire Azure AD access token."
        ) from exc



async def get_powerbi_embed_token() -> Dict[str, Any]:
    """
    Fetches report details and generates a PowerBI embed token for client view.
    Returns ONLY { embedToken, embedUrl, reportId, expiration }.
    Credentials and workspace IDs are kept strictly private on the backend.
    """
    workspace_id = settings.powerbi_workspace_id
    report_id = settings.powerbi_report_id

    if not workspace_id or not report_id:
        logger.error("PowerBI workspace_id or report_id missing.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PowerBI report parameters are not configured."
        )

    # 1. Acquire Azure AD Bearer Token
    aad_token = await get_azure_ad_token()

    headers = {
        "Authorization": f"Bearer {aad_token}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            # 2. Get Report Embed URL
            report_url = f"{POWERBI_API_BASE}/groups/{workspace_id}/reports/{report_id}"
            report_res = await client.get(report_url, headers=headers)
            
            if report_res.status_code in (401, 403):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to PowerBI workspace or report."
                )
            elif report_res.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="PowerBI report or workspace not found."
                )
            report_res.raise_for_status()
            report_data = report_res.json()
            embed_url = report_data.get("embedUrl", "")

            # 3. Generate Embed Token
            generate_token_url = f"{POWERBI_API_BASE}/groups/{workspace_id}/reports/{report_id}/GenerateToken"
            token_payload = {"accessLevel": "View"}
            
            token_res = await client.post(generate_token_url, headers=headers, json=token_payload)
            if token_res.status_code in (401, 403):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to generate PowerBI embed token."
                )
            token_res.raise_for_status()
            token_data = token_res.json()

            embed_token = token_data.get("token", "")
            expiration = token_data.get("expiration", "")

            # Return strictly public embed information to the frontend
            return {
                "embedToken": embed_token,
                "embedUrl": embed_url,
                "reportId": report_id,
                "expiration": expiration,
            }

    except httpx.TimeoutException:
        logger.error("PowerBI REST API call timed out.")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="PowerBI service request timed out."
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error communicating with PowerBI REST API.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PowerBI report embed token."
        ) from exc
