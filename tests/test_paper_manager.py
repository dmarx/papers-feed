# tests/test_paper_manager.py
import json
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock
import asyncio

from scripts.paper_manager import PaperManager
from scripts.models import Paper, ReadingSession, PaperRegistrationEvent

@pytest.fixture
def paper_dir(tmp_path):
    """Create test papers directory."""
    papers_dir = tmp_path / "papers"
    papers_dir.mkdir(parents=True)
    return papers_dir

@pytest.fixture
def paper_manager(paper_dir):
    """Create PaperManager instance for testing."""
    return PaperManager(paper_dir)

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
    """Create mock ArxivAPI."""
    with patch('scripts.paper_manager.ArxivAPI') as mock:
        api = mock.return_value
        api.fetch_metadata = AsyncMock()
        yield api

class TestPaperManager:
    @pytest.mark.asyncio
    async def test_get_or_create_paper_new(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test getting/creating a new paper."""
        arxiv_id = "2401.00001"
        mock_arxiv_api.fetch_metadata.return_value = sample_paper

        # Get non-existent paper
        paper = await paper_manager.get_or_create_paper(arxiv_id)
        
        # Verify paper was created
        assert paper.arxiv_id == arxiv_id
        assert paper.title == "Test Paper"
        
        # Verify directory structure
        paper_dir = paper_manager.data_dir / arxiv_id
        assert paper_dir.exists()
        assert (paper_dir / "metadata.json").exists()
        assert (paper_dir / "events.log").exists()

        # Verify ArXiv API was called
        mock_arxiv_api.fetch_metadata.assert_called_once_with(arxiv_id)

    @pytest.mark.asyncio
    async def test_get_or_create_paper_existing(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test getting existing paper."""
        arxiv_id = "2401.00001"
        
        # Create initial paper
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        paper_manager.save_metadata(sample_paper)
        
        # Get existing paper
        paper = await paper_manager.get_or_create_paper(arxiv_id)
        
        # Verify paper data
        assert paper.arxiv_id == arxiv_id
        assert paper.title == "Test Paper"
        
        # Verify ArXiv API wasn't called
        mock_arxiv_api.fetch_metadata.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_paper_new(self, paper_manager, sample_paper):
        """Test creating new paper."""
        arxiv_id = "2401.00001"
        
        # Create paper
        await paper_manager.create_paper(sample_paper)
        
        # Verify directory structure
        paper_dir = paper_manager.data_dir / arxiv_id
        assert paper_dir.exists()
        assert (paper_dir / "metadata.json").exists()
        assert (paper_dir / "events.log").exists()
        
        # Verify paper registration event
        events_file = paper_dir / "events.log"
        with events_file.open() as f:
            event_data = json.loads(f.readline())
            assert event_data["type"] == "paper_registered"
            assert event_data["arxiv_id"] == arxiv_id

    @pytest.mark.asyncio
    async def test_create_paper_existing(self, paper_manager, sample_paper):
        """Test creating paper that already exists."""
        # Create initial paper
        arxiv_id = "2401.00001"
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        paper_manager.save_metadata(sample_paper)
        
        # Try creating again
        with pytest.raises(ValueError, match="Paper directory already exists"):
            await paper_manager.create_paper(sample_paper)

    @pytest.mark.asyncio
    async def test_ensure_paper_exists_new(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test ensuring paper exists when it doesn't."""
        arxiv_id = "2401.00001"
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        paper = await paper_manager.ensure_paper_exists(arxiv_id)
        
        assert paper.arxiv_id == arxiv_id
        assert paper.title == "Test Paper"
        mock_arxiv_api.fetch_metadata.assert_called_once_with(arxiv_id)

    @pytest.mark.asyncio
    async def test_ensure_paper_exists_existing(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test ensuring paper exists when it does."""
        arxiv_id = "2401.00001"
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        paper_manager.save_metadata(sample_paper)
        
        paper = await paper_manager.ensure_paper_exists(arxiv_id)
        
        assert paper.arxiv_id == arxiv_id
        assert paper.title == "Test Paper"
        mock_arxiv_api.fetch_metadata.assert_not_called()

    @pytest.mark.asyncio
    async def test_append_event_new_paper(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test appending event for new paper."""
        arxiv_id = "2401.00001"
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        event = ReadingSession(
            arxivId=arxiv_id,
            timestamp=datetime.utcnow().isoformat(),
            duration_minutes=30,
            issue_url="https://github.com/user/repo/issues/1"
        )
        
        await paper_manager.append_event(arxiv_id, event)
        
        # Verify paper was created
        paper_dir = paper_manager.data_dir / arxiv_id
        assert paper_dir.exists()
        assert (paper_dir / "metadata.json").exists()
        
        # Verify event was logged
        events_file = paper_dir / "events.log"
        assert events_file.exists()
        
        # Verify both registration and reading events
        events = events_file.read_text().splitlines()
        assert len(events) == 2  # Registration event + reading event
        
        reg_event = json.loads(events[0])
        read_event = json.loads(events[1])
        
        assert reg_event["type"] == "paper_registered"
        assert read_event["type"] == "reading_session"
        assert read_event["duration_minutes"] == 30

    @pytest.mark.asyncio
    async def test_update_reading_time(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test updating reading time."""
        arxiv_id = "2401.00001"
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        # Update reading time
        await paper_manager.update_reading_time(arxiv_id, 30)
        
        # Verify update
        paper = await paper_manager.get_or_create_paper(arxiv_id)
        assert paper.total_reading_time_minutes == 30
        assert paper.last_read is not None

    def test_modified_files_tracking(self, paper_manager, sample_paper):
        """Test tracking modified files."""
        arxiv_id = "2401.00001"
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        
        # Track metadata modification
        paper_manager.save_metadata(sample_paper)
        assert any("metadata.json" in f for f in paper_manager.get_modified_files())
        
        # Clear tracking
        paper_manager.clear_modified_files()
        assert len(paper_manager.get_modified_files()) == 0

    @pytest.mark.asyncio
    async def test_create_paper_cleanup_on_failure(self, paper_manager, sample_paper):
        """Test cleanup on paper creation failure."""
        arxiv_id = "2401.00001"
        
        # Create a file that will cause the creation to fail
        paper_dir = paper_manager.data_dir / arxiv_id
        paper_dir.mkdir(parents=True)
        (paper_dir / "metadata.json").touch()
        
        with pytest.raises(ValueError):
            await paper_manager.create_paper(sample_paper)
        
        # Directory should still exist because it wasn't created by create_paper
        assert paper_dir.exists()

    @pytest.mark.asyncio
    async def test_concurrent_event_logging(self, paper_manager, sample_paper, mock_arxiv_api):
        """Test concurrent event logging."""
        arxiv_id = "2401.00001"
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        # Create multiple events
        events = [
            ReadingSession(
                arxivId=arxiv_id,
                timestamp=f"2024-01-01T0{i}:00:00Z",
                duration_minutes=30,
                issue_url=f"https://github.com/user/repo/issues/{i}"
            ) for i in range(10)
        ]
        
        # Log events concurrently
        await asyncio.gather(*(
            paper_manager.append_event(arxiv_id, event)
            for event in events
        ))
        
        # Verify all events were logged
        events_file = paper_manager.data_dir / arxiv_id / "events.log"
        lines = events_file.read_text().splitlines()
        
        # First line should be registration event, followed by reading events
        assert len(lines) == 11  # 1 registration + 10 reading events
        
        # Parse and verify events
        events_data = [json.loads(line) for line in lines]
        assert events_data[0]["type"] == "paper_registered"
        
        reading_events = events_data[1:]
        assert all(e["type"] == "reading_session" for e in reading_events)
        assert all(e["duration_minutes"] == 30 for e in reading_events)
        assert len({e["timestamp"] for e in reading_events}) == 10  # All timestamps unique
