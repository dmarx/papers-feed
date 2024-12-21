# tests/test_arxiv_api.py
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from scripts.arxiv_api import ArxivAPI
from scripts.models import Paper

@pytest.fixture
def sample_arxiv_response():
    """Sample XML response from arXiv API."""
    return '''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Test Paper Title</title>
    <id>http://arxiv.org/abs/2401.00001</id>
    <published>2024-01-01T00:00:00Z</published>
    <updated>2024-01-01T00:00:00Z</updated>
    <summary>This is a test abstract.</summary>
    <author>
      <name>Test Author One</name>
    </author>
    <author>
      <name>Test Author Two</name>
    </author>
    <link href="http://arxiv.org/abs/2401.00001" rel="alternate" type="text/html"/>
    <link href="http://arxiv.org/pdf/2401.00001" rel="related" type="application/pdf"/>
  </entry>
</feed>'''

@pytest.fixture
def mock_response(sample_arxiv_response):
    """Mock aiohttp response."""
    response = AsyncMock()
    response.status = 200
    response.text = AsyncMock(return_value=sample_arxiv_response)
    return response

@pytest.fixture
def mock_session(mock_response):
    """Mock aiohttp ClientSession with async context manager."""
    session = AsyncMock()
    session.__aenter__.return_value = session
    session.__aexit__.return_value = None
    session.get.return_value.__aenter__.return_value = mock_response
    return session

class TestArxivAPI:
    @pytest.mark.asyncio
    async def test_fetch_metadata_success(self, mock_session):
        """Test successful metadata fetch and parsing."""
        with patch('aiohttp.ClientSession', return_value=mock_session):
            api = ArxivAPI()
            paper = await api.fetch_metadata("2401.00001")
            
            assert isinstance(paper, Paper)
            assert paper.arxiv_id == "2401.00001"
            assert paper.title == "Test Paper Title"
            assert paper.authors == "Test Author One, Test Author Two"
            assert paper.abstract == "This is a test abstract."
            assert paper.url == "http://arxiv.org/abs/2401.00001"

    @pytest.mark.asyncio
    async def test_fetch_metadata_api_error(self, mock_session, mock_response):
        """Test handling of API errors."""
        mock_response.status = 404
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            api = ArxivAPI()
            with pytest.raises(ValueError, match="ArXiv API error: 404"):
                await api.fetch_metadata("2401.00001")

    @pytest.mark.asyncio
    async def test_fetch_metadata_invalid_xml(self, mock_session, mock_response):
        """Test handling of invalid XML responses."""
        mock_response.text = AsyncMock(return_value="Invalid XML")
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            api = ArxivAPI()
            with pytest.raises(ValueError, match="Invalid XML response"):
                await api.fetch_metadata("2401.00001")

    @pytest.mark.asyncio
    async def test_fetch_metadata_missing_entry(self, mock_session, mock_response):
        """Test handling of XML response without entry element."""
        mock_response.text = AsyncMock(return_value='''<?xml version="1.0"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
            </feed>''')
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            api = ArxivAPI()
            with pytest.raises(ValueError, match="No entry found"):
                await api.fetch_metadata("2401.00001")

    @pytest.mark.asyncio
    async def test_fetch_metadata_partial_data(self, mock_session, mock_response):
        """Test handling of XML response with partial data."""
        mock_response.text = AsyncMock(return_value='''<?xml version="1.0"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry>
                <title>Test Title</title>
                <!-- Missing authors and abstract -->
              </entry>
            </feed>''')
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            api = ArxivAPI()
            paper = await api.fetch_metadata("2401.00001")
            
            assert paper.title == "Test Title"
            assert paper.authors == ""  # Should handle missing authors
            assert paper.abstract == ""  # Should handle missing abstract

    @pytest.mark.asyncio
    async def test_rate_limiting(self, mock_session):
        """Test rate limiting behavior."""
        api = ArxivAPI()
        api.delay = 0.1  # Reduce delay for testing
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            start_time = asyncio.get_event_loop().time()
            
            # Make multiple concurrent requests
            results = await asyncio.gather(
                api.fetch_metadata("2401.00001"),
                api.fetch_metadata("2401.00002"),
                api.fetch_metadata("2401.00003")
            )
            
            end_time = asyncio.get_event_loop().time()
            
            # Verify all requests succeeded
            assert all(isinstance(paper, Paper) for paper in results)
            
            # Verify rate limiting delay was applied
            # Should take at least (num_requests - 1) * delay seconds
            assert end_time - start_time >= (len(results) - 1) * api.delay

    @pytest.mark.asyncio
    async def test_network_error(self, mock_session):
        """Test handling of network errors."""
        session = AsyncMock()
        session.__aenter__.return_value = session
        session.get.side_effect = Exception("Network error")
        
        with patch('aiohttp.ClientSession', return_value=session):
            api = ArxivAPI()
            with pytest.raises(Exception, match="Network error"):
                await api.fetch_metadata("2401.00001")
