# tests/test_arxiv_api.py
import pytest
from unittest.mock import AsyncMock, patch
from scripts.arxiv_api import ArxivAPI
from scripts.models import Paper

@pytest.fixture
def mock_response():
    """Create mock response with successful data."""
    response = AsyncMock()
    response.status = 200
    response.text.return_value = '''<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
                <title>Test Paper Title</title>
                <summary>Test Abstract</summary>
                <author><name>Test Author</name></author>
                <link href="http://arxiv.org/abs/2401.00001" rel="alternate" type="text/html"/>
            </entry>
        </feed>'''
    return response

@pytest.fixture
def mock_session(mock_response):
    """Create mock session returning mock response."""
    session = AsyncMock()
    session.get.return_value.__aenter__.return_value = mock_response
    return session

@pytest.fixture
def api():
    """Create ArxivAPI instance with mocked delay."""
    api = ArxivAPI()
    api.delay = 0  # Disable delay for testing
    return api

class TestArxivAPI:
    @pytest.mark.asyncio
    async def test_fetch_metadata_success(self, api, mock_session):
        """Test successful metadata fetch."""
        with patch('aiohttp.ClientSession', return_value=mock_session):
            paper = await api.fetch_metadata("2401.00001")
            assert isinstance(paper, Paper)
            assert paper.arxiv_id == "2401.00001"
            assert paper.title == "Test Paper Title"

    @pytest.mark.asyncio
    async def test_fetch_metadata_api_error(self, api, mock_session, mock_response):
        """Test handling of API error."""
        mock_response.status = 404
        with patch('aiohttp.ClientSession', return_value=mock_session):
            with pytest.raises(ValueError, match="ArXiv API error: 404"):
                await api.fetch_metadata("2401.00001")

    @pytest.mark.asyncio
    async def test_fetch_metadata_invalid_xml(self, api, mock_session, mock_response):
        """Test handling of invalid XML."""
        mock_response.text.return_value = "Invalid XML"
        with patch('aiohttp.ClientSession', return_value=mock_session):
            with pytest.raises(ValueError):
                await api.fetch_metadata("2401.00001")
