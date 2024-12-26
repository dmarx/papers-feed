# tests/test_markdown_service.py
import pytest
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from scripts.markdown_service import MarkdownService
from scripts.paper_manager import PaperManager
from scripts.models import Paper

@pytest.fixture
def paper_dir(test_dir):
    """Create a paper directory."""
    paper_dir = test_dir / "2401.00001"
    if paper_dir.exists():
        shutil.rmtree(paper_dir)
    paper_dir.mkdir(parents=True)
    return paper_dir

@pytest.fixture
def paper_manager(test_dir):
    """Create PaperManager instance."""
    return PaperManager(test_dir)

@pytest.fixture
def mock_paper():
    """Create a mock paper."""
    return Paper(
        arxivId="2401.00001",
        title="Test Paper",
        authors="Test Author",
        abstract="Test abstract",
        url="https://arxiv.org/abs/2401.00001",
        issue_number=1,
        issue_url="https://github.com/user/repo/issues/1",
        created_at=datetime.now().isoformat(),
        state="open",
        labels=["reading"],
        main_tex_file=None
    )

@pytest.fixture
def service(test_dir, paper_manager):
    """Create MarkdownService instance with PaperManager."""
    # Clean up any existing test data
    test_papers_dir = test_dir / "2401.00001"
    if test_papers_dir.exists():
        shutil.rmtree(test_papers_dir)
    return MarkdownService(test_dir, paper_manager)

class TestMarkdownService:
    def test_convert_paper_success(self, service, source_dir, mock_pandoc, mock_paper, paper_manager):
        """Test successful paper conversion with metadata tracking."""
        paper_dir = source_dir.parent
        arxiv_id = paper_dir.name
        
        # Setup paper metadata
        paper_manager.create_paper(mock_paper)
        
        # Convert paper
        success = service.convert_paper(arxiv_id)
        assert success
        
        # Check markdown file
        markdown_file = paper_dir / f"{arxiv_id}.md"
        assert markdown_file.exists()
        
        # Verify main tex file was recorded
        updated_paper = paper_manager.get_paper(arxiv_id)
        assert updated_paper.main_tex_file is not None
        assert Path(updated_paper.main_tex_file).exists()

    def test_convert_paper_no_source(self, service, paper_dir, mock_paper, paper_manager):
        """Test conversion without source files."""
        arxiv_id = paper_dir.name
        paper_manager.create_paper(mock_paper)
        
        success = service.convert_paper(arxiv_id)
        assert not success
        assert arxiv_id in service.failed_conversions

    def test_force_reconversion(self, service, source_dir, mock_pandoc, mock_paper, paper_manager):
        """Test forced reconversion with metadata preservation."""
        paper_dir = source_dir.parent
        arxiv_id = paper_dir.name
        
        # Setup paper with initial conversion
        paper_manager.create_paper(mock_paper)
        markdown_file = paper_dir / f"{arxiv_id}.md"
        service.convert_paper(arxiv_id)
        
        # Record initial tex file
        initial_tex = paper_manager.get_paper(arxiv_id).main_tex_file
        assert initial_tex is not None
        
        # Force reconversion
        success = service.convert_paper(arxiv_id, force=True)
        assert success
        assert "Mock Pandoc Output" in markdown_file.read_text()
        
        # Verify tex file path preserved
        updated_paper = paper_manager.get_paper(arxiv_id)
        assert updated_paper.main_tex_file == initial_tex

    def test_skip_recent_failure(self, service, paper_dir, mock_paper, paper_manager):
        """Test that recent failures are skipped."""
        arxiv_id = paper_dir.name
        paper_manager.create_paper(mock_paper)
        
        service._record_failure(arxiv_id, "Test error")
        success = service.convert_paper(arxiv_id)
        assert not success

    def test_default_paper_manager(self, test_dir):
        """Test MarkdownService creates default PaperManager."""
        service = MarkdownService(test_dir)
        assert isinstance(service.paper_manager, PaperManager)
        assert service.paper_manager.data_dir == Path(test_dir)

    def test_main_tex_file_persistence(self, service, source_dir, mock_pandoc, mock_paper, paper_manager):
        """Test main tex file path is preserved across conversions."""
        paper_dir = source_dir.parent
        arxiv_id = paper_dir.name
        
        # Setup paper
        paper_manager.create_paper(mock_paper)
        
        # First conversion
        success = service.convert_paper(arxiv_id)
        assert success
        
        # Get recorded tex file
        first_tex = paper_manager.get_paper(arxiv_id).main_tex_file
        assert first_tex is not None
        
        # Multiple reconversions
        for _ in range(3):
            success = service.convert_paper(arxiv_id, force=True)
            assert success
            current_tex = paper_manager.get_paper(arxiv_id).main_tex_file
            assert current_tex == first_tex
