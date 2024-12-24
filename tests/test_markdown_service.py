# tests/test_markdown_service.py
import pytest
from pathlib import Path
from datetime import datetime, timedelta
import json
from unittest.mock import Mock, patch

from scripts.markdown_service import MarkdownService
from scripts.pandoc_utils import PandocConfig

@pytest.fixture
def test_dir(tmp_path):
    """Create temporary directory for all test files."""
    return tmp_path

@pytest.fixture
def service(test_dir):
    """Create MarkdownService instance."""
    return MarkdownService(test_dir)

@pytest.fixture
def paper_dir(service):
    """Create a paper directory for testing."""
    arxiv_id = "2401.00001"
    paper_dir = service.papers_dir / arxiv_id
    paper_dir.mkdir(parents=True)
    return paper_dir

@pytest.fixture
def sample_tex_content():
    """Sample LaTeX content for testing."""
    return r"""
\documentclass{article}
\begin{document}
\title{Test Document}
\maketitle
\section{Introduction}
Test content
\end{document}
"""

class TestMarkdownService:
    def test_get_conversion_status_empty(self, service):
        """Test conversion status for paper with no files."""
        arxiv_id = "2401.00001"
        status = service.get_conversion_status(arxiv_id)
        
        assert status == {
            "has_markdown": False,
            "has_source": False,
            "failed": False,
            "last_attempt": None,
            "error": None
        }

    def test_get_conversion_status_with_markdown(self, service, paper_dir):
        """Test conversion status with existing markdown."""
        arxiv_id = paper_dir.name
        markdown_file = paper_dir / f"{arxiv_id}.md"
        markdown_file.write_text("# Test")
        
        status = service.get_conversion_status(arxiv_id)
        assert status["has_markdown"]
        assert not status["failed"]

    def test_get_conversion_status_failed(self, service, paper_dir):
        """Test conversion status for failed conversion."""
        arxiv_id = paper_dir.name
        service._record_failure(arxiv_id, "Test error")
        
        status = service.get_conversion_status(arxiv_id)
        assert status["failed"]
        assert status["error"] == "Test error"
        assert status["last_attempt"] is not None

    def test_should_retry_conversion(self, service):
        """Test retry timing logic."""
        arxiv_id = "2401.00001"
        
        # No previous failure
        assert service.should_retry_conversion(arxiv_id)
        
        # Recent failure
        service._record_failure(arxiv_id, "Test error")
        assert not service.should_retry_conversion(arxiv_id)
        
        # Old failure
        old_time = (datetime.utcnow() - timedelta(hours=25)).isoformat()
        service.failed_conversions[arxiv_id]["last_attempt"] = old_time
        service._save_failed_conversions()
        assert service.should_retry_conversion(arxiv_id)

    def test_convert_paper_success(self, service, paper_dir, sample_tex_content):
        """Test successful paper conversion."""
        arxiv_id = paper_dir.name
        source_dir = paper_dir / "source"
        source_dir.mkdir()
        tex_file = source_dir / "main.tex"
        tex_file.write_text(sample_tex_content)
        
        with patch('scripts.pandoc_utils.PandocConverter.convert_tex_to_markdown') as mock_convert:
            mock_convert.return_value = True
            
            success = service.convert_paper(arxiv_id)
            
            assert success
            mock_convert.assert_called_once()
            assert arxiv_id not in service.failed_conversions

    def test_convert_paper_failure(self, service, paper_dir):
        """Test handling of conversion failures."""
        arxiv_id = paper_dir.name
        source_dir = paper_dir / "source"
        source_dir.mkdir()
        
        success = service.convert_paper(arxiv_id)
        
        assert not success
        assert arxiv_id in service.failed_conversions
        assert "No .tex files found" in service.failed_conversions[arxiv_id]["error"]

    def test_convert_paper_no_source(self, service, paper_dir):
        """Test conversion without source files."""
        arxiv_id = paper_dir.name
        success = service.convert_paper(arxiv_id)
        
        assert not success
        assert arxiv_id in service.failed_conversions
        assert "No source directory" in service.failed_conversions[arxiv_id]["error"]

    def test_retry_failed_conversions(self, service, paper_dir):
        """Test retrying failed conversions."""
        arxiv_id = paper_dir.name
        service._record_failure(arxiv_id, "Test error")
        
        # Create source files for successful retry
        source_dir = paper_dir / "source"
        source_dir.mkdir()
        tex_file = source_dir / "main.tex"
        tex_file.write_text(r"\documentclass{article}\begin{document}Test\end{document}")
        
        with patch('scripts.pandoc_utils.PandocConverter.convert_tex_to_markdown') as mock_convert:
            mock_convert.return_value = True
            
            service.retry_failed_conversions(force=True)
            
            mock_convert.assert_called_once()
            assert arxiv_id not in service.failed_conversions

    def test_persistent_failure_tracking(self, service, paper_dir):
        """Test that failure tracking persists across instances."""
        arxiv_id = paper_dir.name
        error_msg = "Test error"
        service._record_failure(arxiv_id, error_msg)
        
        # Create new service instance
        new_service = MarkdownService(service.papers_dir)
        
        assert arxiv_id in new_service.failed_conversions
        assert new_service.failed_conversions[arxiv_id]["error"] == error_msg

    def test_force_reconversion(self, service, paper_dir, mock_pandoc):
        """Test forced reconversion of papers."""
        arxiv_id = paper_dir.name
        markdown_file = paper_dir / f"{arxiv_id}.md"
        
        # Create source files
        source_dir = paper_dir / "source"
        source_dir.mkdir()
        tex_file = source_dir / "main.tex"
        tex_file.write_text(r"\documentclass{article}\begin{document}Test\end{document}")
        
        service.convert_paper(arxiv_id)  # First conversion
        original_content = markdown_file.read_text()
        
        success = service.convert_paper(arxiv_id, force=True)  # Force reconversion
        assert success
        
        new_content = markdown_file.read_text()
        assert "Mock Pandoc Output" in new_content
        assert new_content != original_content  # Content should change

    def test_clear_failure_after_success(self, service, paper_dir, mock_pandoc):
        """Test that successful conversion clears failure record."""
        arxiv_id = paper_dir.name
        service._record_failure(arxiv_id, "Test error")
        
        # Setup for successful conversion
        source_dir = paper_dir / "source"
        source_dir.mkdir()
        tex_file = source_dir / "main.tex"
        tex_file.write_text(r"\documentclass{article}\begin{document}Test\end{document}")
        
        success = service.convert_paper(arxiv_id, force=True)  # Force retry
        assert success
        assert arxiv_id not in service.failed_conversions

    def test_skip_recent_failure(self, service, paper_dir):
        """Test that recent failures are skipped."""
        arxiv_id = paper_dir.name
        service._record_failure(arxiv_id, "Test error")
        
        with patch('scripts.pandoc_utils.PandocConverter.convert_tex_to_markdown') as mock_convert:
            service.convert_paper(arxiv_id)
            mock_convert.assert_not_called()
        
        # Should still be marked as failed
        assert arxiv_id in service.failed_conversions

    def test_conversion_with_missing_tex(self, service, paper_dir, mock_pandoc):
        """Test handling when main tex file can't be found."""
        arxiv_id = paper_dir.name
        source_dir = paper_dir / "source"
        source_dir.mkdir()
        
        # Create non-main tex files that should be rejected
        (source_dir / "appendix.tex").write_text("\\section{Appendix}")
        (source_dir / "supplement.tex").write_text("\\section{Supplement}")
        
        # Attempt conversion
        success = service.convert_paper(arxiv_id)
        assert not success  # Should fail with non-main tex files

    def test_conversion_empty_source_dir(self, service, paper_dir):
        """Test handling of empty source directory."""
        arxiv_id = paper_dir.name
        source_dir = paper_dir / "source"
        source_dir.mkdir()
        
        success = service.convert_paper(arxiv_id)
        
        assert not success
        assert arxiv_id in service.failed_conversions
        assert "No .tex files found" in service.failed_conversions[arxiv_id]["error"]
