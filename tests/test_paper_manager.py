# tests/test_paper_manager.py
import json
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock

from scripts.paper_manager import PaperManager
from scripts.models import Paper, ReadingSession, PaperRegistrationEvent

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
        total_reading_time_minutes=0,
        last_read=None
    )

@pytest.fixture
def mock_arxiv_api():
    """Mock ArxivAPI."""
    with patch('scripts.arxiv_api.ArxivAPI') as mock:
        api = mock.return_value
        api.fetch_metadata = AsyncMock()
        yield api

@pytest.fixture
def paper_manager(paper_dir, mock_arxiv_api):
    """Create PaperManager instance for testing."""
    return PaperManager(paper_dir)

class TestPaperManager:
    def test_create_paper(self, paper_manager, sample_paper):
        """Test creating a new paper."""
        paper_manager.create_paper(sample_paper)
        
        # Verify directory structure
        paper_dir = paper_manager.data_dir / sample_paper.arxiv_id
        assert paper_dir.exists()
        assert (paper_dir / "metadata.json").exists()
        assert (paper_dir / "events.log").exists()
        
        # Verify metadata
        with (paper_dir / "metadata.json").open() as f:
            saved_data = json.load(f)
            assert saved_data["arxivId"] == sample_paper.arxiv_id
            assert saved_data["title"] == sample_paper.title

        # Verify registration event
        with (paper_dir / "events.log").open() as f:
            event_data = json.loads(f.readline())
            assert event_data["type"] == "paper_registered"
            assert event_data["arxiv_id"] == sample_paper.arxiv_id

    def test_get_or_create_paper_new(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test getting non-existent paper."""
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        paper = paper_manager.get_or_create_paper(sample_paper.arxiv_id)
        
        assert paper.arxiv_id == sample_paper.arxiv_id
        assert paper.title == sample_paper.title
        mock_arxiv_api.fetch_metadata.assert_called_once()

    def test_get_or_create_paper_existing(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test getting existing paper."""
        # Create initial paper
        paper_manager.create_paper(sample_paper)
        
        paper = paper_manager.get_or_create_paper(sample_paper.arxiv_id)
        
        assert paper.arxiv_id == sample_paper.arxiv_id
        assert paper.title == sample_paper.title
        mock_arxiv_api.fetch_metadata.assert_not_called()

    def test_ensure_paper_exists_new(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test ensuring paper exists when it doesn't."""
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        paper = paper_manager.ensure_paper_exists(sample_paper.arxiv_id)
        
        assert paper.arxiv_id == sample_paper.arxiv_id
        assert paper.title == sample_paper.title
        mock_arxiv_api.fetch_metadata.assert_called_once()

    def test_ensure_paper_exists_existing(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test ensuring paper exists when it does."""
        paper_manager.create_paper(sample_paper)
        
        paper = paper_manager.ensure_paper_exists(sample_paper.arxiv_id)
        
        assert paper.arxiv_id == sample_paper.arxiv_id
        mock_arxiv_api.fetch_metadata.assert_not_called()

    def test_append_event(self, paper_manager, sample_paper):
        """Test appending events."""
        # Create paper first
        paper_manager.create_paper(sample_paper)
        
        # Create and append reading session event
        event = ReadingSession(
            arxivId=sample_paper.arxiv_id,
            timestamp=datetime.utcnow().isoformat(),
            duration_minutes=30,
            issue_url="https://example.com/1"
        )
        
        paper_manager.append_event(sample_paper.arxiv_id, event)
        
        # Verify event was logged
        events_file = paper_manager.data_dir / sample_paper.arxiv_id / "events.log"
        events = events_file.read_text().splitlines()
        
        # Should have registration event + reading event
        assert len(events) == 2
        
        read_event = json.loads(events[1])  # Second event
        assert read_event["type"] == "reading_session"
        assert read_event["duration_minutes"] == 30

    def test_update_reading_time(self, paper_manager, sample_paper):
        """Test updating paper reading time."""
        paper_manager.create_paper(sample_paper)
        
        paper_manager.update_reading_time(sample_paper.arxiv_id, 30)
        
        paper = paper_manager.load_metadata(sample_paper.arxiv_id)
        assert paper.total_reading_time_minutes == 30
        assert paper.last_read is not None

    def test_modified_files_tracking(self, paper_manager, sample_paper):
        """Test tracking modified files."""
        paper_manager.create_paper(sample_paper)
        
        modified = paper_manager.get_modified_files()
        assert len(modified) == 2  # metadata.json and events.log
        assert any("metadata.json" in f for f in modified)
        assert any("events.log" in f for f in modified)
        
        paper_manager.clear_modified_files()
        assert len(paper_manager.get_modified_files()) == 0

    def test_error_handling(self, paper_manager, sample_paper):
        """Test error handling in paper operations."""
        # Test duplicate paper creation
        paper_manager.create_paper(sample_paper)
        with pytest.raises(ValueError, match="Paper directory already exists"):
            paper_manager.create_paper(sample_paper)
        
        # Test loading non-existent paper
        with pytest.raises(FileNotFoundError):
            paper_manager.load_metadata("nonexistent")

    def test_file_permissions(self, paper_manager, sample_paper, tmp_path):
        """Test handling of file permission issues."""
        # Make directory read-only
        paper_dir = paper_manager.data_dir / sample_paper.arxiv_id
        paper_dir.mkdir()
        paper_dir.chmod(0o444)  # Read-only
        
        with pytest.raises(Exception):  # Should raise some kind of file operation error
            paper_manager.create_paper(sample_paper)

    def test_concurrent_event_logging(self, paper_manager, sample_paper):
        """Test concurrent event logging."""
        # Create paper first
        paper_manager.create_paper(sample_paper)
        
        # Create multiple events
        events = [
            ReadingSession(
                arxivId=sample_paper.arxiv_id,
                timestamp=f"2024-01-01T0{i}:00:00Z",
                duration_minutes=30,
                issue_url=f"https://example.com/{i}"
            ) for i in range(10)
        ]
        
        # Log events
        for event in events:
            paper_manager.append_event(sample_paper.arxiv_id, event)
        
        # Verify all events were logged
        events_file = paper_manager.data_dir / sample_paper.arxiv_id / "events.log"
        lines = events_file.read_text().splitlines()
        
        # Should have registration event + reading events
        assert len(lines) == 11  # 1 registration + 10 reading events
        
        # Verify events
        read_events = [json.loads(line) for line in lines[1:]]  # Skip registration
        assert all(e["type"] == "reading_session" for e in read_events)
        assert all(e["duration_minutes"] == 30 for e in read_events)
        assert len({e["timestamp"] for e in read_events}) == 10  # All timestamps unique
