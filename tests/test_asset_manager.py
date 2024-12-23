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
def manager(mock_arxiv_client, mock_markdown_service):
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

def test_force_processing(manager, mock_arxiv_client, mock_markdown_service):
    """Test forced reprocessing of assets."""
    arxiv_id = "2401.00001"
    (manager.papers_dir / arxiv_id).mkdir()
    
    manager.process_paper_assets(arxiv_id, force=True)
    
    mock_arxiv_client.download_paper.assert_called_once_with(
        arxiv_id,
        skip_existing=False
    )
    mock_markdown_service.convert_paper.assert_called_once_with(
        arxiv_id,
        force=True
    )
