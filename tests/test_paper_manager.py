import json
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

from scripts.paper_manager import PaperManager
from scripts.models import Paper, ReadingSession, PaperRegistrationEvent
from scripts.arxiv_client import ArxivClient

@pytest.fixture
def test_dir(tmp_path):
    """Create temporary directory for test data."""
    return tmp_path / "papers"

@pytest.fixture
def manager(test_dir):
    """Create PaperManager instance with test directory."""
    return PaperManager(test_dir)

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

class TestPaperManager:
    def test_get_paper_not_found(self, manager):
        """Test getting non-existent paper."""
        with pytest.raises(FileNotFoundError):
            manager.get_paper("2401.00001")

    def test_create_and_get_paper(self, manager, sample_paper):
        """Test creating and retrieving a paper."""
        manager.create_paper(sample_paper)
        retrieved = manager.get_paper(sample_paper.arxiv_id)
        assert retrieved.arxiv_id == sample_paper.arxiv_id
        assert retrieved.title == sample_paper.title

    def test_get_or_create_paper_existing(self, manager, sample_paper):
        """Test get_or_create with existing paper."""
        manager.create_paper(sample_paper)
        paper = manager.get_or_create_paper(sample_paper.arxiv_id)
        assert paper.arxiv_id == sample_paper.arxiv_id
        assert paper.title == sample_paper.title

    def test_get_or_create_paper_new(self, manager):
        """Test get_or_create fetches new paper."""
        arxiv_id = "2401.00001"
        with patch.object(ArxivClient, 'fetch_metadata') as mock_fetch:
            mock_fetch.return_value = Paper(
                arxivId=arxiv_id,
                title="New Paper",
                authors="New Author",
                abstract="New Abstract",
                url=f"https://arxiv.org/abs/{arxiv_id}",
                issue_number=1,
                issue_url="https://github.com/user/repo/issues/1",
                created_at=datetime.utcnow().isoformat(),
                state="open",
                labels=[],
                total_reading_time_seconds=0
            )
            
            paper = manager.get_or_create_paper(arxiv_id)
            assert paper.arxiv_id == arxiv_id
            assert paper.title == "New Paper"
            mock_fetch.assert_called_once_with(arxiv_id)

    def test_update_reading_time(self, manager, sample_paper):
        """Test updating paper reading time."""
        manager.create_paper(sample_paper)
        duration = 300  # 5 minutes
        
        manager.update_reading_time(sample_paper.arxiv_id, duration)
        paper = manager.get_paper(sample_paper.arxiv_id)
        
        assert paper.total_reading_time_seconds == duration
        assert paper.last_read is not None

    def test_append_event(self, manager, sample_paper):
        """Test appending reading session event."""
        manager.create_paper(sample_paper)
        
        event = ReadingSession(
            arxivId=sample_paper.arxiv_id,
            timestamp=datetime.utcnow().isoformat(),
            duration_seconds=300,
            issue_url="https://github.com/user/repo/issues/2"
        )
        
        manager.append_event(sample_paper.arxiv_id, event)
        
        # Verify event was written
        events_file = manager.data_dir / sample_paper.arxiv_id / manager._event_log_fname
        assert events_file.exists()
        
        # Read and verify event content
        events = [json.loads(line) for line in events_file.read_text().splitlines() if line.strip()]
        assert len(events) == 2  # Should have registration and reading session events
        
        # Verify registration event
        reg_event = events[0]
        assert reg_event["type"] == "paper_registered"
        assert reg_event["arxiv_id"] == sample_paper.arxiv_id
        
        # Verify reading session event
        session_event = events[1]
        assert session_event["type"] == "reading_session"
        assert session_event["arxivId"] == sample_paper.arxiv_id
        assert session_event["duration_seconds"] == 300

    def test_modified_files_tracking(self, manager, sample_paper):
        """Test tracking of modified files."""
        manager.create_paper(sample_paper)
        
        # Check metadata file was tracked
        metadata_path = str(manager.data_dir / sample_paper.arxiv_id / "metadata.json")
        assert metadata_path in manager.get_modified_files()
        
        # Clear and verify
        manager.clear_modified_files()
        assert len(manager.get_modified_files()) == 0
        
        # Update and verify new modification tracked
        manager.update_reading_time(sample_paper.arxiv_id, 300)
        assert metadata_path in manager.get_modified_files()

    def test_save_load_metadata(self, manager, sample_paper):
        """Test metadata serialization."""
        manager.save_metadata(sample_paper)
        loaded = manager.load_metadata(sample_paper.arxiv_id)
        
        assert loaded.model_dump() == sample_paper.model_dump()
