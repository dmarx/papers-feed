# tests/test_arxiv_api.py
import pytest
from unittest.mock import Mock, patch
import xml.etree.ElementTree as ET
from scripts.arxiv_api import ArxivAPI
from scripts.models import Paper

@pytest.fixture
def arxiv_success_response():
    """Sample successful arXiv API response."""
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
def api():
    """Create ArxivAPI instance with disabled rate limiting."""
    api = ArxivAPI()
    api.min_delay = 0  # Disable rate limiting for tests
    return api

class TestArxivAPI:
    def test_fetch_metadata_success(self, api, arxiv_success_response):
        """Test successful metadata fetch."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.text = arxiv_success_response
            
            paper = api.fetch_metadata("2401.00001")
            
            assert isinstance(paper, Paper)
            assert paper.arxiv_id == "2401.00001"
            assert paper.title == "Test Paper Title"
            assert paper.authors == "Test Author One, Test Author Two"
            assert paper.abstract == "Test Abstract"
            assert paper.url == "http://arxiv.org/abs/2401.00001"
            
            # Verify API call
            mock_get.assert_called_once()
            args, kwargs = mock_get.call_args
            assert "2401.00001" in args[0]
            assert kwargs["headers"]["User-Agent"].startswith("ArxivPaperTracker")

    def test_fetch_metadata_api_error(self, api):
        """Test handling of API error responses."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 404
            
            with pytest.raises(ValueError, match="ArXiv API error: 404"):
                api.fetch_metadata("2401.00001")

    def test_fetch_metadata_network_error(self, api):
        """Test handling of network errors."""
        with patch('requests.get') as mock_get:
            mock_get.side_effect = Exception("Network error")
            
            with pytest.raises(Exception, match="Network error"):
                api.fetch_metadata("2401.00001")

    def test_fetch_metadata_invalid_xml(self, api):
        """Test handling of invalid XML responses."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.text = "Invalid XML"
            
            with pytest.raises(ValueError, match="Invalid XML response"):
                api.fetch_metadata("2401.00001")

    def test_rate_limiting(self, api):
        """Test rate limiting between requests."""
        api.min_delay = 0.1  # Short delay for testing
        
        with patch('requests.get') as mock_get, \
             patch('time.sleep') as mock_sleep:
            
            mock_get.return_value.status_code = 200
            mock_get.return_value.text = "<feed><entry></entry></feed>"
            
            # Make multiple requests
            for _ in range(3):
                api.fetch_metadata("2401.00001")
            
            # Verify rate limiting was applied
            assert mock_sleep.call_count == 2  # Called between requests
            assert all(args[0] >= 0.1 for args, _ in mock_sleep.call_args_list)
