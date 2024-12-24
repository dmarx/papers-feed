# tests/test_asset_manager.py
import pytest
from pathlib import Path
from unittest.mock import patch

from scripts.asset_manager import PaperAssetManager

@pytest.fixture
def manager(test_dir):
    """Create AssetManager with mocked dependencies."""
    with patch('scripts.arxiv_client.ArxivClient') as mock_arxiv, \
         patch('scripts.markdown_service.MarkdownService') as mock_markdown:
        
        # Configure mock ArxivClient
        mock_arxiv.return_value.get_paper_status.return_value = {
            "has_pdf": False,
            "has_source": False,
        }
        mock_arxiv.return_value.download_pdf.return_value = True
        mock_arxiv.return_value.download_source.return_value = True
        
        # Configure mock MarkdownService
        mock_markdown.return_value.get_conversion_status.return_value = {
            "has_markdown": False,
            "has_source": False,
            "failed": False,
        }
        mock_markdown.return_value.convert_paper.return_value = True
        
        yield PaperAssetManager(
            papers_dir=test_dir,
            arxiv_client=mock_arxiv.return_value,
            markdown_service=mock_markdown.return_value
        )

def test_ensure_all_assets(manager):
    """Test processing all papers."""
    # Create test papers
    (manager.papers_dir / "2401.00001").mkdir()
    (manager.papers_dir / "2401.00002").mkdir()
    
    # Set up mock behavior to create conditions for markdown conversion
    def get_paper_status(arxiv_id):
        # After "downloading" source files, report them as present
        call_count = manager.arxiv.download_source.call_count
        return {
            "has_pdf": False,  # Always need PDF
            "has_source": call_count > 0,  # Source exists after download
        }
    
    def get_conversion_status(arxiv_id):
        return {
            "has_markdown": False,  # Always need markdown conversion
            "has_source": True,  # Source files present
            "failed": False,
        }
    
    manager.arxiv.get_paper_status.side_effect = get_paper_status
    manager.markdown.get_conversion_status.side_effect = get_conversion_status
    
    manager.ensure_all_assets()
    
    # Verify all operations were attempted
    assert manager.arxiv.download_pdf.call_count == 2
    assert manager.arxiv.download_source.call_count == 2
    assert manager.markdown.convert_paper.call_count == 2

def test_convert_markdown(manager):
    """Test converting papers to markdown."""
    # Create test papers
    paper_dirs = ["2401.00001", "2401.00002"]
    for name in paper_dirs:
        (manager.papers_dir / name).mkdir()
    
    # Configure mock for papers with source
    manager.arxiv.get_paper_status.return_value = {"has_pdf": True, "has_source": True}
    manager.markdown.get_conversion_status.return_value = {
        "has_markdown": False,
        "has_source": True,
        "failed": False,
    }
    
    results = manager.convert_markdown()
    assert len(results) == 2
    assert all(results.values())
    assert manager.markdown.convert_paper.call_count == 2
