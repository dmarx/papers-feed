# tests/test_markdown_service.py
import pytest
import json
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from scripts.markdown_service import MarkdownService
from scripts.paper_manager import PaperManager

@pytest.fixture
def paper_manager(test_dir):
    """Create PaperManager instance."""
    return PaperManager(test_dir)

@pytest.fixture
def service(test_dir):
    """Create MarkdownService instance."""
    return MarkdownService(test_dir)

@pytest.fixture
def setup_metadata_with_tex(paper_dir):
    """Setup metadata.json with main_tex_file specified."""
    metadata = {
        "arxivId": paper_dir.name,
        "title": "Test Paper",
        "authors": "Test Author",
        "abstract": "Test abstract",
        "url": "https://arxiv.org/abs/test",
        "issue_number": 1,
        "issue_url": "https://github.com/test/issue/1",
        "created_at": "2024-01-01T00:00:00Z",
        "state": "open",
        "labels": [],
        "main_tex_file": "source/main.tex"
    }
    metadata_file = paper_dir / "metadata.json"
    metadata_file.write_text(json.dumps(metadata, indent=2))
    return metadata_file

class TestMarkdownService:
    def test_convert_with_metadata_tex_file(self, service, source_dir, setup_metadata_with_tex, mock_pandoc):
        """Test conversion using main_tex_file from metadata."""
        paper_dir = source_dir.parent
        main_tex = source_dir / "main.tex"
        main_tex.write_text("\\documentclass{article}\n\\begin{document}\nTest\n\\end{document}")
        
        success = service.convert_paper(paper_dir.name)
        assert success
        assert (paper_dir / f"{paper_dir.name}.md").exists()

    def test_convert_with_invalid_metadata_tex_file(self, service, source_dir, setup_metadata_with_tex):
        """Test fallback when metadata specifies non-existent tex file."""
        paper_dir = source_dir.parent
        metadata = json.loads(setup_metadata_with_tex.read_text())
        metadata["main_tex_file"] = "source/nonexistent.tex"
        setup_metadata_with_tex.write_text(json.dumps(metadata, indent=2))
        
        # Should fall back to inference
        success = service.convert_paper(paper_dir.name)
        assert not success
        assert paper_dir.name in service.failed_conversions

    def test_convert_with_paper_manager_update(self, service, source_dir, paper_manager, mock_pandoc):
        """Test conversion after updating main_tex_file via PaperManager."""
        # Get paths from fixtures
        paper_dir = source_dir.parent
        main_tex = source_dir / "main.tex"
        
        # Create initial metadata using the paper directory name from fixture
        from scripts.models import Paper
        paper = Paper(
            arxivId=paper_dir.name,
            title="Test Paper",
            authors="Test Author",
            abstract="Test abstract", 
            url=f"https://arxiv.org/abs/{paper_dir.name}",
            issue_number=1,
            issue_url=f"https://github.com/test/issue/1",
            created_at="2024-01-01T00:00:00Z",
            state="open",
            labels=[]
        )
        
        # Ensure clean state and create paper
        import shutil
        if paper_dir.exists():
            shutil.rmtree(paper_dir)
        paper_manager.create_paper(paper)
        
        # Recreate source directory and tex file
        source_dir.mkdir(parents=True)
        main_tex.write_text(r"""
\documentclass{article}
\begin{document}
\title{Test Document}
\maketitle
\section{Introduction}
Test content
\end{document}
""")
        
        # Update via PaperManager
        paper_manager.update_main_tex_file(paper_dir.name, main_tex)
        
        # Verify conversion uses specified file
        success = service.convert_paper(paper_dir.name)
        assert success
        assert (paper_dir / f"{paper_dir.name}.md").exists()
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
