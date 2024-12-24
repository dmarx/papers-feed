# tests/test_asset_manager.py

import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

from scripts.asset_manager import PaperAssetManager

@pytest.fixture
def mock_arxiv_client():
    """Create mock ArxivClient."""
    with patch('scripts.arxiv_client.ArxivClient') as mock:
        client = mock.return_value
        client.get_paper_status.return_value = {
            "has_pdf": False,
            "has_source": False,
            "pdf_size": 0,
            "source_size": 0
        }
        client.download_pdf.return_value = True
        client.download_source.return_value = True
        yield client

@pytest.fixture
def mock_markdown_service():
    """Create mock MarkdownService."""
    with patch('scripts.markdown_service.MarkdownService') as mock:
        service = mock.return_value
        service.get_conversion_status.return_value = {
            "has_markdown": False,
            "has_source": False,
            "failed": False,
            "last_attempt": None,
            "error": None
        }
        service.convert_paper.return_value = True
        service.failed_conversions = {}
        yield service

@pytest.fixture
def manager(tmp_path, mock_arxiv_client, mock_markdown_service):
    """Create PaperAssetManager with mocked dependencies."""
    return PaperAssetManager(
        papers_dir=tmp_path,
        arxiv_client=mock_arxiv_client,
        markdown_service=mock_markdown_service
    )

def test_find_missing_pdfs(manager):
    """Test finding papers missing PDFs."""
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    def get_status(arxiv_id):
        if arxiv_id == "2401.00002":
            return {"has_pdf": True, "has_source": False}
        return {"has_pdf": False, "has_source": False}
    manager.arxiv.get_paper_status.side_effect = get_status
    
    missing = manager.find_missing_pdfs()
    assert "2401.00001" in missing
    assert "2401.00002" not in missing

def test_find_missing_source(manager):
    """Test finding papers missing source files."""
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    def get_status(arxiv_id):
        if arxiv_id == "2401.00002":
            return {"has_pdf": True, "has_source": True}
        return {"has_pdf": True, "has_source": False}
    manager.arxiv.get_paper_status.side_effect = get_status
    
    missing = manager.find_missing_source()
    assert "2401.00001" in missing
    assert "2401.00002" not in missing

def test_download_pdfs(manager):
    """Test downloading missing PDFs."""
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    manager.arxiv.get_paper_status.return_value = {"has_pdf": False, "has_source": False}
    manager.arxiv.download_pdf.return_value = True
    
    results = manager.download_pdfs()
    assert all(results.values())  # All downloads successful
    assert manager.arxiv.download_pdf.call_count == 2

def test_download_source(manager):
    """Test downloading missing source files."""
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    manager.arxiv.get_paper_status.return_value = {"has_pdf": True, "has_source": False}
    manager.arxiv.download_source.return_value = True
    
    results = manager.download_source()
    assert all(results.values())  # All downloads successful
    assert manager.arxiv.download_source.call_count == 2

def test_convert_markdown(manager):
    """Test converting papers to markdown."""
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    def get_paper_status(arxiv_id):
        return {"has_pdf": True, "has_source": True}
    def get_markdown_status(arxiv_id):
        return {"has_markdown": False, "has_source": True, "failed": False}
    
    manager.arxiv.get_paper_status.side_effect = get_paper_status
    manager.markdown.get_conversion_status.side_effect = get_markdown_status
    manager.markdown.convert_paper.return_value = True
    
    results = manager.convert_markdown()
    assert all(results.values())  # All conversions successful
    assert manager.markdown.convert_paper.call_count == 2

def test_download_failure(manager):
    """Test handling download failures."""
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    
    manager.arxiv.get_paper_status.return_value = {"has_pdf": False, "has_source": False}
    manager.arxiv.download_pdf.return_value = False  # Simulate failure
    
    results = manager.download_pdfs()
    assert not results["2401.00001"]  # Download failed

def test_force_processing(manager):
    """Test forced downloads and conversions."""
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    
    # Set up mocks for success
    manager.arxiv.get_paper_status.return_value = {"has_pdf": True, "has_source": True}
    manager.arxiv.download_pdf.return_value = True
    manager.arxiv.download_source.return_value = True
    manager.markdown.convert_paper.return_value = True
    
    results = manager.download_pdfs(force=True)
    assert results["2401.00001"]  # Should process even though pdf exists
    
    results = manager.download_source(force=True)
    assert results["2401.00001"]  # Should process even though source exists

def test_ensure_all_assets(manager):
    """Test processing all incomplete papers."""
    (manager.papers_dir / "2401.00001").mkdir()
    (manager.papers_dir / "2401.00002").mkdir()
    
    def get_status(arxiv_id):
        return {"has_pdf": False, "has_source": False}
    
    def get_conversion_status(arxiv_id):
        return {
            "has_markdown": False, 
            "has_source": True,
            "failed": False
        }
    
    manager.arxiv.get_paper_status.side_effect = get_status
    manager.markdown.get_conversion_status.side_effect = get_conversion_status
    
    manager.ensure_all_assets()
    
    # Verify all operations were attempted
    assert manager.arxiv.download_pdf.call_count == 2
    assert manager.arxiv.download_source.call_count == 2
    assert manager.markdown.convert_paper.call_count == 2
