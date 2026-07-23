import asyncio
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.sharepoint_service import get_sharepoint_status, list_sharepoint_files

client = TestClient(app)


def test_get_sharepoint_status():
    status = asyncio.run(get_sharepoint_status())
    assert "configured" in status
    assert "token_acquired" in status
    assert "folder_path" in status


def test_list_sharepoint_files_fallback():
    with patch("app.services.sharepoint_service.get_graph_access_token", new_callable=AsyncMock) as mock_token:
        mock_token.return_value = None
        files = asyncio.run(list_sharepoint_files("CVs"))
        assert files == []


def test_sharepoint_status_api_unauthorized():
    res = client.get("/api/sharepoint/status")
    assert res.status_code in (401, 403)
