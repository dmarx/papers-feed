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
        client.download_paper.return_value = True
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
    # Create papers with different states
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    # Configure mock responses
    def get_status(arxiv_id):
        return {
            "has_pdf": arxiv_id == "2401.00002",
            "has_source": False,
            "pdf_size": 1000 if arxiv_id == "2401.00002" else 0,
            "source_size": 0
        }
    manager.arxiv.get_paper_status.side_effect = get_status
    
    missing = manager.find_missing_pdfs()
    assert len(missing) == 1
    assert "2401.00001" in missing

def test_find_missing_source(manager):
    """Test finding papers missing source files."""
    # Create papers with different states
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    # Configure mock responses
    def get_status(arxiv_id):
        return {
            "has_pdf": True,
            "has_source": arxiv_id == "2401.00002",
            "pdf_size": 1000,
            "source_size": 1000 if arxiv_id == "2401.00002" else 0
        }
    manager.arxiv.get_paper_status.side_effect = get_status
    
    missing = manager.find_missing_source()
    assert len(missing) == 1
    assert "2401.00001" in missing

def test_find_pending_markdown(manager):
    """Test finding papers with source but no markdown."""
    # Create papers with different states
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    # Configure mock responses
    def get_paper_status(arxiv_id):
        return {
            "has_pdf": True,
            "has_source": True,
            "pdf_size": 1000,
            "source_size": 1000
        }
    def get_markdown_status(arxiv_id):
        return {
            "has_markdown": arxiv_id == "2401.00002",
            "has_source": True,
            "failed": False,
            "last_attempt": None,
            "error": None
        }
    
    manager.arxiv.get_paper_status.side_effect = get_paper_status
    manager.markdown.get_conversion_status.side_effect = get_markdown_status
    
    pending = manager.find_pending_markdown()
    assert len(pending) == 1
    assert "2401.00001" in pending

def test_download_pdfs(manager):
    """Test downloading missing PDFs."""
    # Setup papers needing PDFs
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    manager.arxiv.get_paper_status.return_value = {"has_pdf": False, "has_source": False}
    
    results = manager.download_pdfs()
    assert len(results) == 2
    assert all(success for success in results.values())
    assert manager.arxiv.download_pdf.call_count == 2

def test_download_source(manager):
    """Test downloading missing source files."""
    # Setup papers needing source
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    manager.arxiv.get_paper_status.return_value = {"has_pdf": True, "has_source": False}
    
    results = manager.download_source()
    assert len(results) == 2
    assert all(success for success in results.values())
    assert manager.arxiv.download_source.call_count == 2

def test_convert_markdown(manager):
    """Test converting papers to markdown."""
    # Setup papers needing conversion
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    manager.arxiv.get_paper_status.return_value = {"has_pdf": True, "has_source": True}
    manager.markdown.get_conversion_status.return_value = {
        "has_markdown": False,
        "has_source": True,
        "failed": False
    }
    
    results = manager.convert_markdown()
    assert len(results) == 2
    assert all(success for success in results.values())
    assert manager.markdown.convert_paper.call_count == 2

def test_ensure_all_assets(manager):
    """Test processing all incomplete papers."""
    # Setup test papers
    (manager.papers_dir / "2401.00001").mkdir()
    (manager.papers_dir / "2401.00002").mkdir()
    
    # Configure mock responses
    manager.arxiv.get_paper_status.return_value = {
        "has_pdf": False,
        "has_source": False
    }
    manager.markdown.get_conversion_status.return_value = {
        "has_markdown": False,
        "has_source": False,
        "failed": False
    }
    
    manager.ensure_all_assets()
    
    # Verify all operations were attempted
    assert manager.arxiv.download_pdf.call_count == 2
    assert manager.arxiv.download_source.call_count == 2
    assert manager.markdown.convert_paper.call_count == 2
