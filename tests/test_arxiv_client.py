# tests/test_arxiv_client.py
import pytest
from pathlib import Path
from io import StringIO
import tarfile
import tempfile
from unittest.mock import Mock, patch
import xml.etree.ElementTree as ET

from scripts.arxiv_client import ArxivClient
from scripts.models import Paper


@pytest.fixture
def client(test_dir):
    """Create ArxivClient instance with rate limiting disabled."""
    client = ArxivClient(test_dir)
    client.min_delay = 0  # Disable rate limiting for tests
    return client

@pytest.fixture
def arxiv_success_response():
    """Sample successful arXiv API response."""
    return '''<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom" 
              xmlns:arxiv="http://arxiv.org/schemas/atom">
            <entry>
                <title>Test Paper Title</title>
                <summary>Test Abstract</summary>
                <author>
                    <name>Test Author One</name>
                </author>
                <author>
                    <name>Test Author Two</name>
                </author>
                <published>2024-01-01T00:00:00Z</published>
                <link href="http://arxiv.org/abs/2401.00001" rel="alternate" type="text/html"/>
                <arxiv:primary_category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
                <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
                <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
            </entry>
        </feed>'''

class TestArxivClient:
    def test_get_paper_dir(self, client):
        """Test paper directory creation."""
        arxiv_id = "2401.00001"
        paper_dir = client.get_paper_dir(arxiv_id)
        
        assert paper_dir.exists()
        assert paper_dir.is_dir()
        assert paper_dir.name == arxiv_id

    def test_get_paper_status_empty(self, client):
        """Test paper status for paper with no files."""
        arxiv_id = "2401.00001"
        client.get_paper_dir(arxiv_id)  # Create directory
        
        status = client.get_paper_status(arxiv_id)
        assert status == {
            "has_pdf": False,
            "has_source": False,
            "pdf_size": 0,
            "source_size": 0
        }

    def test_get_paper_status_with_files(self, client):
        """Test paper status with existing files."""
        arxiv_id = "2401.00001"
        paper_dir = client.get_paper_dir(arxiv_id)
        
        # Create dummy PDF
        pdf_file = paper_dir / f"{arxiv_id}.pdf"
        pdf_file.write_bytes(b"dummy pdf")
        
        # Create dummy source
        source_dir = paper_dir / "source"
        source_dir.mkdir()
        (source_dir / "main.tex").write_text("dummy tex")
        
        status = client.get_paper_status(arxiv_id)
        assert status["has_pdf"]
        assert status["has_source"]
        assert status["pdf_size"] > 0
        assert status["source_size"] > 0
    
    def test_fetch_metadata_success(self, client, arxiv_success_response):
        """Test successful metadata fetch with extended fields."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.text = arxiv_success_response
            
            paper = client.fetch_metadata("2401.00001")
            
            assert isinstance(paper, Paper)
            assert paper.arxiv_id == "2401.00001"
            assert paper.title == "Test Paper Title"
            assert paper.authors == "Test Author One, Test Author Two"
            assert paper.abstract == "Test Abstract"
            assert "arxiv.org/abs/2401.00001" in paper.url
            
            # Check new fields
            assert paper.published_date == "2024-01-01T00:00:00Z"
            assert paper.arxiv_tags == ["cs.LG", "cs.AI"]
            
            # Verify API call
            mock_get.assert_called_once()
            args, kwargs = mock_get.call_args
            assert "2401.00001" in args[0]
            assert kwargs["headers"]["User-Agent"].startswith("ArxivPaperTracker")

    def test_fetch_metadata_api_error(self, client):
        """Test handling of API error responses."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 404
            
            with pytest.raises(ValueError, match="ArXiv API error: 404"):
                client.fetch_metadata("2401.00001")

    def test_fetch_metadata_invalid_xml(self, client):
        """Test handling of invalid XML responses."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.text = "Invalid XML"
            
            with pytest.raises(ValueError, match="Invalid XML response"):
                client.fetch_metadata("2401.00001")

    def test_download_pdf_success(self, client):
        """Test successful PDF download."""
        arxiv_id = "2401.00001"
        pdf_content = b"Test PDF content"
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.content = pdf_content
            
            success = client.download_pdf(arxiv_id)
            
            assert success
            paper_dir = client.get_paper_dir(arxiv_id)
            pdf_file = paper_dir / f"{arxiv_id}.pdf"
            assert pdf_file.exists()
            assert pdf_file.read_bytes() == pdf_content

    def test_download_pdf_failure(self, client):
        """Test handling of PDF download failures."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 404
            
            success = client.download_pdf("2401.00001")
            assert not success

        def test_download_source_success(self, client):
            """Test successful source download."""
            arxiv_id = "2401.00001"
            
            # Create a test tar file
            with tempfile.NamedTemporaryFile(suffix='.tar') as tmp_file:
                with tarfile.open(tmp_file.name, 'w') as tar:
                    content = b"Test TeX content"
                    info = tarfile.TarInfo(name="main.tex")
                    info.size = len(content)
                    content_io = io.BytesIO(content)
                    tar.addfile(info, content_io)
                
                with patch('requests.get') as mock_get:
                    mock_get.return_value.status_code = 200
                    mock_get.return_value.content = open(tmp_file.name, 'rb').read()
                    
                    success = client.download_source(arxiv_id)
                    
                    assert success
                    source_dir = client.get_paper_dir(arxiv_id) / "source"
                    assert source_dir.exists()
                    assert (source_dir / "main.tex").exists()
                    assert b"Test TeX content" in (source_dir / "main.tex").read_bytes()

    def test_download_source_failure(self, client):
        """Test handling of source download failures."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 404
            
            success = client.download_source("2401.00001")
            assert not success

    def test_download_paper_complete(self, client):
        """Test downloading complete paper with PDF and source."""
        arxiv_id = "2401.00001"
        
        with patch.object(client, 'download_pdf') as mock_pdf, \
             patch.object(client, 'download_source') as mock_source:
            
            mock_pdf.return_value = True
            mock_source.return_value = True
            
            success = client.download_paper(arxiv_id)
            
            assert success
            mock_pdf.assert_called_once()
            mock_source.assert_called_once()

    def test_rate_limiting(self, client):
        """Test rate limiting between requests."""
        client.min_delay = 0.1  # Short delay for testing
        
        with patch('requests.get') as mock_get, \
             patch('time.sleep') as mock_sleep:
            
            mock_get.return_value.status_code = 200
            mock_get.return_value.text = '''<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
            <title>Test</title>
            <summary>Test summary</summary>
        </entry>
    </feed>'''
            
            # Make multiple requests
            for _ in range(3):
                client.fetch_metadata("2401.00001")
            
            assert mock_sleep.call_count == 2  # Called between requests
