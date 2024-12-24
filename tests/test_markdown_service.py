# tests/test_markdown_service.py
import pytest
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch

from scripts.markdown_service import MarkdownService

@pytest.fixture
def service(test_dir):
    """Create MarkdownService instance."""
    return MarkdownService(test_dir)

class TestMarkdownService:
    def test_convert_paper_success(self, service, source_dir, mock_pandoc):
        """Test successful paper conversion."""
        paper_dir = source_dir.parent
        success = service.convert_paper(paper_dir.name)
        assert success
        assert (paper_dir / f"{paper_dir.name}.md").exists()

    def test_convert_paper_no_source(self, service, paper_dir):
        """Test conversion without source files."""
        success = service.convert_paper(paper_dir.name)
        assert not success
        assert paper_dir.name in service.failed_conversions

    def test_force_reconversion(self, service, source_dir, mock_pandoc):
        """Test forced reconversion."""
        paper_dir = source_dir.parent
        arxiv_id = paper_dir.name
        
        # First conversion
        markdown_file = paper_dir / f"{arxiv_id}.md"
        service.convert_paper(arxiv_id)
        assert markdown_file.exists()
        
        # Force reconversion
        success = service.convert_paper(arxiv_id, force=True)
        assert success
        assert "Mock Pandoc Output" in markdown_file.read_text()

    def test_skip_recent_failure(self, service, paper_dir):
        """Test that recent failures are skipped."""
        service._record_failure(paper_dir.name, "Test error")
        success = service.convert_paper(paper_dir.name)
        assert not success
