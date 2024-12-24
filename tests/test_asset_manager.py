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
        yield service

@pytest.fixture
def manager(tmp_path, mock_arxiv_client, mock_markdown_service):
    """Create PaperAssetManager with mocked dependencies."""
    return PaperAssetManager(
        papers_dir=tmp_path,
        arxiv_client=mock_arxiv_client,
        markdown_service=mock_markdown_service
    )

@pytest.fixture
def paper_dir(manager):
    """Create a paper directory for testing."""
    arxiv_id = "2401.00001"
    paper_dir = manager.papers_dir / arxiv_id
    paper_dir.mkdir()
    return paper_dir
    

def test_get_incomplete_assets(manager, paper_dir, mock_arxiv_client, mock_markdown_service):
    """Test detection of papers with incomplete assets."""
    # Create a few paper directories with different states
    paper1_id = "2401.00001"  # Missing everything
    paper2_id = "2401.00002"  # Has PDF but missing source
    
    (manager.papers_dir / paper2_id).mkdir()
    
    # Configure mock responses
    def get_paper_status(arxiv_id):
        if arxiv_id == paper2_id:
            return {
                "has_pdf": True,
                "has_source": False,
                "pdf_size": 1000,
                "source_size": 0
            }
        return {
            "has_pdf": False,
            "has_source": False,
            "pdf_size": 0,
            "source_size": 0
        }
    
    mock_arxiv_client.get_paper_status.side_effect = get_paper_status
    
    # Get incomplete papers
    papers = manager.get_incomplete_assets()
    
    # Should find both papers
    assert len(papers) == 2
    
    # Verify paper states
    paper1 = next(p for p in papers if p["arxiv_id"] == paper1_id)
    assert not paper1["has_pdf"]
    assert not paper1["has_source"]
    assert not paper1["has_markdown"]
    
    paper2 = next(p for p in papers if p["arxiv_id"] == paper2_id)
    assert paper2["has_pdf"]
    assert not paper2["has_source"]
    assert not paper2["has_markdown"]

def test_process_paper_assets_success(manager, mock_arxiv_client, mock_markdown_service):
    """Test successful paper asset processing."""
    arxiv_id = "2401.00001"
    
    success = manager.process_paper_assets(arxiv_id)
    
    assert success
    mock_arxiv_client.download_paper.assert_called_once_with(
        arxiv_id, 
        skip_existing=True
    )
    mock_markdown_service.convert_paper.assert_called_once_with(
        arxiv_id,
        force=False
    )

def test_process_paper_assets_download_failure(manager, mock_arxiv_client, mock_markdown_service):
    """Test handling of download failures."""
    arxiv_id = "2401.00001"
    mock_arxiv_client.download_paper.return_value = False
    
    success = manager.process_paper_assets(arxiv_id)
    
    assert not success
    mock_arxiv_client.download_paper.assert_called_once()
    mock_markdown_service.convert_paper.assert_not_called()

def test_process_paper_assets_conversion_failure(manager, mock_arxiv_client, mock_markdown_service):
    """Test handling of markdown conversion failures."""
    arxiv_id = "2401.00001"
    mock_markdown_service.convert_paper.return_value = False
    
    success = manager.process_paper_assets(arxiv_id)
    
    assert not success
    mock_arxiv_client.download_paper.assert_called_once()
    mock_markdown_service.convert_paper.assert_called_once()

def test_ensure_all_assets(manager, mock_arxiv_client, mock_markdown_service):
    """Test processing all incomplete papers."""
    # Create test papers
    paper1_id = "2401.00001"
    paper2_id = "2401.00002"
    
    (manager.papers_dir / paper1_id).mkdir()
    (manager.papers_dir / paper2_id).mkdir()
    
    # Configure initial paper states
    mock_arxiv_client.get_paper_status.side_effect = [
        {"has_pdf": False, "has_source": False, "pdf_size": 0, "source_size": 0},
        {"has_pdf": True, "has_source": False, "pdf_size": 1000, "source_size": 0}
    ]
    
    # Process all papers
    manager.ensure_all_assets()
    
    # Both papers should be processed
    assert mock_arxiv_client.download_paper.call_count == 2
    assert mock_markdown_service.convert_paper.call_count == 2

def test_retry_failed_markdown(manager, mock_markdown_service):
    """Test retrying failed markdown conversions."""
    manager.ensure_all_assets(retry_failed=True)
    mock_markdown_service.retry_failed_conversions.assert_called_once_with(force=False)

# tests/test_asset_manager.py

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
    
    def get_status(arxiv_id):
        return {"has_pdf": False, "has_source": False}
    manager.arxiv.get_paper_status.side_effect = get_status
    manager.arxiv.download_pdf.return_value = True
    
    results = manager.download_pdfs()
    assert all(results.values())  # All downloads successful
    assert manager.arxiv.download_pdf.call_count == 2

def test_download_source(manager):
    """Test downloading missing source files."""
    (manager.papers_dir / "2401.00001").mkdir(parents=True)
    (manager.papers_dir / "2401.00002").mkdir(parents=True)
    
    def get_status(arxiv_id):
        return {"has_pdf": True, "has_source": False}
    manager.arxiv.get_paper_status.side_effect = get_status
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
    
    # Test force download PDFs
    results = manager.download_pdfs(force=True)
    assert results["2401.00001"]  # Should process even though pdf exists
    
    # Test force download source
    results = manager.download_source(force=True)
    assert results["2401.00001"]  # Should process even though source exists
