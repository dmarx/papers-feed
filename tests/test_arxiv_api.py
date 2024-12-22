# tests/test_arxiv_api.py
import pytest
from unittest.mock import AsyncMock, patch
from scripts.arxiv_api import ArxivAPI
from scripts.models import Paper

@pytest.fixture
def arxiv_success_response():
    """Mock successful arXiv API response."""
    return '''<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
                <title>Test Paper Title</title>
                <summary>Test Abstract</summary>
                <author>
                    <name>Test Author One</name>
                </author>
                <author>
                    <name>Test Author Two</name>
                </author>
                <link href="http://arxiv.org/abs/2401.00001" rel="alternate" type="text/html"/>
            </entry>
        </feed>'''

@pytest.fixture
def mock_http_session(arxiv_success_response):
    """Create mock aiohttp session."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.text.return_value = arxiv_success_response
    
    mock_session = AsyncMock()
    mock_session_ctx = AsyncMock()
    mock_session_ctx.__aenter__.return_value = mock_response
    mock_session_ctx.__aexit__.return_value = None
    mock_session.get.return_value = mock_session_ctx
    
    return mock_session

@pytest.fixture
def api():
    """Create ArxivAPI instance."""
    api = ArxivAPI()
    api.delay = 0  # Disable delay for testing
    return api

class TestArxivAPI:
    @pytest.mark.asyncio
    async def test_fetch_metadata_success(self, api, mock_http_session):
        """Test successful metadata fetch."""
        with patch('aiohttp.ClientSession', return_value=mock_http_session):
            paper = await api.fetch_metadata("2401.00001")
            
            assert isinstance(paper, Paper)
            assert paper.arxiv_id == "2401.00001"
            assert paper.title == "Test Paper Title"
            assert paper.authors == "Test Author One, Test Author Two"
            assert paper.abstract == "Test Abstract"
            assert paper.url == "http://arxiv.org/abs/2401.00001"

    @pytest.mark.asyncio
    async def test_fetch_metadata_api_error(self, api, mock_http_session):
        """Test handling of API errors."""
        mock_http_session.get.return_value.__aenter__.return_value.status = 404
        
        with patch('aiohttp.ClientSession', return_value=mock_http_session):
            with pytest.raises(ValueError, match="ArXiv API error: 404"):
                await api.fetch_metadata("2401.00001")

    @pytest.mark.asyncio
    async def test_fetch_metadata_network_error(self, api):
        """Test handling of network errors."""
        mock_session = AsyncMock()
        mock_session.get.side_effect = Exception("Network error")
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            with pytest.raises(Exception, match="Network error"):
                await api.fetch_metadata("2401.00001")

    @pytest.mark.asyncio
    async def test_fetch_metadata_invalid_xml(self, api, mock_http_session):
        """Test handling of invalid XML."""
        mock_http_session.get.return_value.__aenter__.return_value.text.return_value = "Invalid XML"
        
        with patch('aiohttp.ClientSession', return_value=mock_http_session):
            with pytest.raises(ValueError, match="Invalid XML response"):
                await api.fetch_metadata("2401.00001")

    @pytest.mark.asyncio
    async def test_rate_limiting(self, api, mock_http_session):
        """Test rate limiting behavior."""
        api.delay = 0.1  # Short delay for testing
        
        with patch('aiohttp.ClientSession', return_value=mock_http_session):
            start_time = pytest.import_time = pytest.importorskip("asyncio").get_event_loop().time()
            
            # Make multiple concurrent requests
            await asyncio.gather(
                api.fetch_metadata("2401.00001"),
                api.fetch_metadata("2401.00002"),
                api.fetch_metadata("2401.00003")
            )
            
            end_time = pytest.import_time = pytest.importorskip("asyncio").get_event_loop().time()
            assert end_time - start_time >= 0.2  # Should take at least 2 delays
