# tests/test_paper_manager.py
import json
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

from scripts.paper_manager import PaperManager
from scripts.models import Paper, ReadingSession

@pytest.fixture
def paper_dir(tmp_path):
    """Create test papers directory."""
    papers_dir = tmp_path / "papers"
    papers_dir.mkdir(parents=True)
    return papers_dir

@pytest.fixture
def sample_paper():
    """Create sample Paper object."""
    return Paper(
        arxivId="2401.00001",
        title="Test Paper",
        authors="Test Author",
        abstract="Test Abstract",
        url="https://arxiv.org/abs/2401.00001",
        issue_number=1,
        issue_url="https://github.com/user/repo/issues/1",
        created_at=datetime.utcnow().isoformat(),
        state="open",
        labels=["paper"],
        total_reading_time_seconds=0,
        last_read=None
    )

@pytest.fixture
def mock_arxiv_client(sample_paper):
    """Mock ArxivClient with pre-configured response."""
    with patch('scripts.arxiv_client.ArxivClient') as mock:
        client = mock.return_value
        client.fetch_metadata = Mock(return_value=sample_paper)
        yield client

@pytest.fixture
def paper_manager(paper_dir, mock_arxiv_client):
    """Create PaperManager instance for testing."""
    return PaperManager(paper_dir, arxiv_client=mock_arxiv_client)

class TestPaperManager:
    def test_get_paper_existing(self, paper_manager, sample_paper):
        """Test getting an existing paper."""
        # Create initial paper
        paper_manager.create_paper(sample_paper)
        
        # Get paper
        paper = paper_manager.get_paper(sample_paper.arxiv_id)
        
        assert paper.arxiv_id == sample_paper.arxiv_id
        assert paper.title == sample_paper.title

    def test_get_paper_not_found(self, paper_manager):
        """Test getting non-existent paper."""
        with pytest.raises(FileNotFoundError):
            paper_manager.get_paper("nonexistent")

    def test_create_paper(self, paper_manager, sample_paper):
        """Test creating a new paper."""
        paper_manager.create_paper(sample_paper)
        
        # Verify directory structure
        paper_dir = paper_manager.data_dir / sample_paper.arxiv_id
        assert paper_dir.exists()
        assert (paper_dir / "metadata.json").exists()
        assert (paper_dir / paper_manager._event_log_fname).exists()
        
        # Verify metadata content
        with (paper_dir / "metadata.json").open() as f:
            saved_data = json.load(f)
            assert saved_data["arxivId"] == sample_paper.arxiv_id
            assert saved_data["title"] == sample_paper.title

        # Verify registration event
        with (paper_dir / paper_manager._event_log_fname).open() as f:
            event_data = json.loads(f.readline())
            assert event_data["type"] == "paper_registered"
            assert event_data["arxiv_id"] == sample_paper.arxiv_id

    def test_create_paper_duplicate(self, paper_manager, sample_paper):
        """Test creating duplicate paper."""
        paper_manager.create_paper(sample_paper)
        
        with pytest.raises(ValueError, match="Paper directory already exists"):
            paper_manager.create_paper(sample_paper)

    def test_fetch_new_paper(self, paper_manager, sample_paper):
        """Test fetching new paper from ArXiv."""
        paper = paper_manager.fetch_new_paper(sample_paper.arxiv_id)
        
        assert paper.arxiv_id == sample_paper.arxiv_id
        assert paper.title == sample_paper.title
        paper_manager.arxiv_client.fetch_metadata.assert_called_once()

    def test_get_or_create_paper_existing(self, paper_manager, sample_paper):
        """Test get_or_create with existing paper."""
        # Create initial paper
        paper_manager.create_paper(sample_paper)
        
        paper = paper_manager.get_or_create_paper(sample_paper.arxiv_id)
        
        assert paper.arxiv_id == sample_paper.arxiv_id
        paper_manager.arxiv_client.fetch_metadata.assert_not_called()

    def test_get_or_create_paper_new(self, paper_manager, sample_paper):
        """Test get_or_create with new paper."""
        
        paper = paper_manager.get_or_create_paper(sample_paper.arxiv_id)
        
        assert paper.arxiv_id == sample_paper.arxiv_id
        paper_manager.arxiv_client.fetch_metadata.assert_called_once()

    def test_append_event(self, paper_manager, sample_paper):
        """Test appending event to paper log."""
        # Create initial paper
        paper_manager.create_paper(sample_paper)
        
        # Create and append event
        event = ReadingSession(
            arxivId=sample_paper.arxiv_id,
            timestamp=datetime.utcnow().isoformat(),
            duration_seconds=30,
            issue_url="https://example.com/1"
        )
        
        paper_manager.append_event(sample_paper.arxiv_id, event)
        
        # Verify event log
        events_file = paper_manager.data_dir / sample_paper.arxiv_id / paper_manager._event_log_fname
        events = events_file.read_text().splitlines()
        
        assert len(events) == 2  # Registration event + reading event
        read_event = json.loads(events[1])
        assert read_event["type"] == "reading_session"
        assert read_event["duration_seconds"] == 30

    def test_update_reading_time(self, paper_manager, sample_paper):
        """Test updating paper reading time."""
        # Create initial paper
        paper_manager.create_paper(sample_paper)
        
        # Update reading time
        paper_manager.update_reading_time(sample_paper.arxiv_id, 30)
        
        # Verify update
        paper = paper_manager.get_paper(sample_paper.arxiv_id)
        assert paper.total_reading_time_seconds == 30
        assert paper.last_read is not None

    def test_modified_files_tracking(self, paper_manager, sample_paper):
        """Test tracking modified files."""
        paper_manager.create_paper(sample_paper)
        
        modified = paper_manager.get_modified_files()
        assert len(modified) == 2  # metadata.json and events.log
        assert any("metadata.json" in f for f in modified)
        assert any(paper_manager._event_log_fname in f for f in modified)
        
        paper_manager.clear_modified_files()
        assert len(paper_manager.get_modified_files()) == 0
