# tests/test_paper_manager.py
import json
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock
from scripts.paper_manager import PaperManager
from scripts.models import Paper, ReadingSession, PaperRegistrationEvent

@pytest.fixture
def paper_manager(tmp_path):
    """Create PaperManager with temporary directory."""
    return PaperManager(tmp_path / "papers")

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
    """Mock ArxivAPI with async fetch_metadata method."""
    mock_api = AsyncMock()
    mock_api.fetch_metadata = AsyncMock()
    return mock_api

class TestPaperManager:
    @pytest.mark.asyncio
    async def test_ensure_paper_exists_new(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test creating new paper directory and metadata."""
        arxiv_id = "2401.00001"
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        with patch('scripts.paper_manager.ArxivAPI', return_value=mock_arxiv_api):
            # Directory shouldn't exist initially
            assert not (paper_manager.data_dir / arxiv_id).exists()
            
            # Create paper
            paper = await paper_manager.ensure_paper_exists(arxiv_id)
            
            # Verify directory and files were created
            paper_dir = paper_manager.data_dir / arxiv_id
            assert paper_dir.exists()
            assert (paper_dir / "metadata.json").exists()
            assert (paper_dir / "events.log").exists()
            
            # Verify paper data
            assert paper.arxiv_id == arxiv_id
            assert paper.title == "Test Paper"
            
            # Verify registration event was logged
            events_file = paper_dir / "events.log"
            event_data = json.loads(events_file.read_text())
            assert event_data["type"] == "paper_registered"
            assert event_data["arxiv_id"] == arxiv_id

    @pytest.mark.asyncio
    async def test_ensure_paper_exists_existing(self, paper_manager, sample_paper):
        """Test handling of existing paper directory."""
        arxiv_id = "2401.00001"
        mock_arxiv_api = AsyncMock()
        
        # Create initial paper
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        paper_manager.save_metadata(sample_paper)
        
        with patch('scripts.paper_manager.ArxivAPI', return_value=mock_arxiv_api):
            paper = await paper_manager.ensure_paper_exists(arxiv_id)
            
            # Verify paper data loaded from existing metadata
            assert paper.arxiv_id == arxiv_id
            assert paper.title == "Test Paper"
            
            # Verify API wasn't called
            mock_arxiv_api.fetch_metadata.assert_not_called()

    def test_update_reading_time(self, paper_manager, sample_paper):
        """Test updating paper reading time."""
        arxiv_id = "2401.00001"
        
        # Setup initial paper
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        paper_manager.save_metadata(sample_paper)
        
        # Update reading time
        paper_manager.update_reading_time(arxiv_id, 30)
        
        # Verify updates
        paper = paper_manager.load_metadata(arxiv_id)
        assert paper.total_reading_time_minutes == 30
        assert paper.last_read is not None

    def test_append_event(self, paper_manager, sample_paper):
        """Test appending events to log file."""
        arxiv_id = "2401.00001"
        
        # Setup initial paper
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        paper_manager.save_metadata(sample_paper)
        
        # Create and append event
        event = ReadingSession(
            arxivId=arxiv_id,
            timestamp=datetime.utcnow().isoformat(),
            duration_minutes=30,
            issue_url="https://github.com/user/repo/issues/2"
        )
        paper_manager.append_event(arxiv_id, event)
        
        # Verify event was logged
        events_file = paper_dir / "events.log"
        assert events_file.exists()
        event_data = json.loads(events_file.read_text())
        assert event_data["type"] == "reading_session"
        assert event_data["duration_minutes"] == 30

    def test_modified_files_tracking(self, paper_manager, sample_paper):
        """Test tracking of modified files."""
        arxiv_id = "2401.00001"
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        
        # Track metadata file modification
        paper_manager.save_metadata(sample_paper)
        assert any("metadata.json" in f for f in paper_manager.get_modified_files())
        
        # Track event log modification
        event = ReadingSession(
            arxivId=arxiv_id,
            timestamp=datetime.utcnow().isoformat(),
            duration_minutes=30,
            issue_url="https://github.com/user/repo/issues/1"
        )
        paper_manager.append_event(arxiv_id, event)
        assert any("events.log" in f for f in paper_manager.get_modified_files())
        
        # Test clearing modified files
        paper_manager.clear_modified_files()
        assert len(paper_manager.get_modified_files()) == 0

    @pytest.mark.asyncio
    async def test_ensure_paper_exists_error(self, paper_manager, mock_arxiv_api):
        """Test error handling in paper creation."""
        arxiv_id = "2401.00001"
        mock_arxiv_api.fetch_metadata.side_effect = ValueError("API Error")
        
        with patch('scripts.paper_manager.ArxivAPI', return_value=mock_arxiv_api):
            with pytest.raises(ValueError, match="API Error"):
                await paper_manager.ensure_paper_exists(arxiv_id)
            
            # Verify directory was cleaned up
            assert not (paper_manager.data_dir / arxiv_id).exists()

    def test_load_metadata_missing(self, paper_manager):
        """Test loading metadata for non-existent paper."""
        with pytest.raises(FileNotFoundError):
            paper_manager.load_metadata("2401.00001")

    def test_concurrent_event_logging(self, paper_manager, sample_paper):
        """Test concurrent event logging."""
        arxiv_id = "2401.00001"
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        paper_manager.save_metadata(sample_paper)
        
        # Create multiple events
        events = [
            ReadingSession(
                arxivId=arxiv_id,
                timestamp=datetime.utcnow().isoformat(),
                duration_minutes=30,
                issue_url=f"https://github.com/user/repo/issues/{i}"
            ) for i in range(10)
        ]
        
        # Log events concurrently
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=4) as executor:
            list(executor.map(
                lambda e: paper_manager.append_event(arxiv_id, e),
                events
            ))
        
        # Verify all events were logged
        events_file = paper_dir / "events.log"
        lines = events_file.read_text().splitlines()
        assert len(lines) == 10
        
        # Verify no corrupted events
        for line in lines:
            event_data = json.loads(line)
            assert event_data["type"] == "reading_session"
            assert event_data["duration_minutes"] == 30
            assert event_data["arxiv_id"] == arxiv_id

    def test_events_log_format(self, paper_manager, sample_paper):
        """Test events log file format and content."""
        arxiv_id = "2401.00001"
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        paper_manager.save_metadata(sample_paper)
        
        # Add different types of events
        events = [
            ReadingSession(
                arxivId=arxiv_id,
                timestamp="2024-01-01T00:00:00Z",
                duration_minutes=30,
                issue_url="https://github.com/user/repo/issues/1"
            ),
            PaperRegistrationEvent(
                timestamp="2024-01-01T01:00:00Z",
                issue_url="https://github.com/user/repo/issues/2",
                arxiv_id=arxiv_id
            )
        ]
        
        for event in events:
            paper_manager.append_event(arxiv_id, event)
        
        # Verify log file format
        events_file = paper_dir / "events.log"
        lines = events_file.read_text().splitlines()
        
        # Verify each event type
        reading_event = json.loads(lines[0])
        assert reading_event["type"] == "reading_session"
        assert reading_event["duration_minutes"] == 30
        
        registration_event = json.loads(lines[1])
        assert registration_event["type"] == "paper_registered"
        assert registration_event["arxiv_id"] == arxiv_id
