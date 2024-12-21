# tests/test_process_events.py
import json
import pytest
import yaml
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock, MagicMock

from scripts.process_events import EventProcessor
from scripts.models import Paper, ReadingSession, PaperRegistrationEvent
from scripts.arxiv_api import ArxivAPI

class AsyncContextManagerMock:
    def __init__(self, return_value):
        self.return_value = return_value
        
    async def __aenter__(self):
        return self.return_value
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

@pytest.fixture
def mock_response():
    """Create mock aiohttp response."""
    response = AsyncMock()
    response.status = 200
    response.json = AsyncMock(return_value=[])
    return response

@pytest.fixture
def mock_session(mock_response):
    """Create mock aiohttp ClientSession."""
    session = Mock()
    session.get = Mock(return_value=AsyncContextManagerMock(mock_response))
    session.post = Mock(return_value=AsyncContextManagerMock(mock_response))
    session.patch = Mock(return_value=AsyncContextManagerMock(mock_response))
    return session

@pytest.fixture
def mock_arxiv_api():
    """Create mock ArxivAPI."""
    with patch('scripts.paper_manager.ArxivAPI') as mock:
        api = mock.return_value
        api.fetch_metadata = AsyncMock()
        yield api

@pytest.fixture
def sample_paper():
    """Create sample Paper object."""
    return Paper(
        arxiv_id="2401.00001",
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
def sample_paper_issue(sample_paper):
    """Create sample paper registration issue."""
    return {
        "number": 1,
        "html_url": "https://github.com/user/repo/issues/1",
        "state": "open",
        "created_at": "2024-01-01T00:00:00Z",
        "labels": [{"name": "paper"}],
        "body": json.dumps({
            "arxivId": sample_paper.arxiv_id,
            "title": sample_paper.title,
            "authors": sample_paper.authors,
            "abstract": sample_paper.abstract,
            "url": sample_paper.url,
            "timestamp": datetime.utcnow().isoformat(),
            "rating": "novote"
        })
    }

@pytest.fixture
def sample_reading_session_issue(sample_paper):
    """Create sample reading session issue."""
    return {
        "number": 2,
        "html_url": "https://github.com/user/repo/issues/2",
        "state": "open",
        "created_at": "2024-01-01T01:00:00Z",
        "labels": [{"name": "reading-session"}],
        "body": json.dumps({
            "type": "reading_session",
            "arxivId": sample_paper.arxiv_id,
            "timestamp": datetime.utcnow().isoformat(),
            "duration_minutes": 30,
            "paper_url": sample_paper.url,
            "paper_title": sample_paper.title
        })
    }

@pytest.fixture
def event_processor(tmp_path):
    """Create EventProcessor with temp directory and mocked environment."""
    with patch.dict('os.environ', {
        'GITHUB_TOKEN': 'fake_token',
        'GITHUB_REPOSITORY': 'user/repo'
    }):
        processor = EventProcessor()
        processor.papers_dir = tmp_path / "papers"
        processor.papers_dir.mkdir(parents=True)
        return processor


class TestEventProcessor:
    @pytest.mark.asyncio
    async def test_process_new_paper_with_arxiv_fetch(
        self, event_processor, sample_paper, sample_paper_issue, mock_arxiv_api
    ):
        """Test processing new paper with ArXiv metadata fetch."""
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        success = await event_processor.process_new_paper(sample_paper_issue)
        assert success
        
        # Verify paper directory and metadata created
        paper_dir = event_processor.papers_dir / sample_paper.arxiv_id
        assert paper_dir.exists()
        assert (paper_dir / "metadata.json").exists()
        assert (paper_dir / "events.log").exists()
        
        # Verify ArXiv API was called
        mock_arxiv_api.fetch_metadata.assert_called_once_with(sample_paper.arxiv_id)
        
        # Verify paper metadata
        metadata_file = paper_dir / "metadata.json"
        paper_data = json.loads(metadata_file.read_text())
        assert paper_data["arxivId"] == sample_paper.arxiv_id
        assert paper_data["title"] == sample_paper.title
        
        # Verify registration event was logged
        events_file = paper_dir / "events.log"
        events = events_file.read_text().splitlines()
        event_data = json.loads(events[0])
        assert event_data["type"] == "paper_registered"
        assert event_data["arxiv_id"] == sample_paper.arxiv_id
        
    @pytest.mark.asyncio
    async def test_process_reading_session_new_paper(
        self, event_processor, sample_paper, sample_reading_session_issue, mock_arxiv_api
    ):
        """Test processing reading session for new paper."""
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        success = await event_processor.process_reading_session(sample_reading_session_issue)
        assert success
        
        # Verify paper was created and metadata updated
        paper = event_processor.paper_manager.load_metadata(sample_paper.arxiv_id)
        assert paper.total_reading_time_minutes == 30
        assert paper.last_read is not None
        
        # Verify events were logged
        paper_dir = event_processor.papers_dir / sample_paper.arxiv_id
        events_file = paper_dir / "events.log"
        events = events_file.read_text().splitlines()
        
        # Should have registration and reading events
        assert len(events) == 2
        
        reg_event = json.loads(events[0])
        read_event = json.loads(events[1])
        
        assert reg_event["type"] == "paper_registered"
        assert read_event["type"] == "reading_session"
        assert read_event["duration_minutes"] == 30

    @pytest.mark.asyncio
    async def test_process_reading_session_existing_paper(
        self, event_processor, sample_paper, sample_reading_session_issue
    ):
        """Test processing reading session for existing paper."""
        # Create initial paper
        paper_dir = event_processor.papers_dir / sample_paper.arxiv_id
        paper_dir.mkdir(parents=True)
        event_processor.paper_manager.save_metadata(sample_paper)
        
        success = await event_processor.process_reading_session(sample_reading_session_issue)
        assert success
        
        # Verify reading time was updated
        paper = event_processor.paper_manager.load_metadata(sample_paper.arxiv_id)
        assert paper.total_reading_time_minutes == 30
        
        # Verify reading event was logged
        events_file = paper_dir / "events.log"
        events = events_file.read_text().splitlines()
        event_data = json.loads(events[0])
        assert event_data["type"] == "reading_session"
        assert event_data["duration_minutes"] == 30

    @pytest.mark.asyncio
    async def test_close_issues(self, event_processor, mock_session):
        """Test closing processed issues."""
        # Setup mock responses for comment and close
        mock_comment_response = AsyncMock()
        mock_comment_response.status = 201
        
        mock_close_response = AsyncMock()
        mock_close_response.status = 200
        
        mock_session.post = Mock(return_value=AsyncContextManagerMock(mock_comment_response))
        mock_session.patch = Mock(return_value=AsyncContextManagerMock(mock_close_response))
        
        # Add processed issues
        event_processor.processed_issues = [1, 2]
        
        await event_processor.close_issues(mock_session)
        
        # Verify comments and closes
        assert mock_session.post.call_count == 2  # One comment per issue
        assert mock_session.patch.call_count == 2  # One close per issue

    @pytest.mark.asyncio
    async def test_process_all_issues(
        self, event_processor, mock_session, sample_paper_issue, sample_reading_session_issue, mock_arxiv_api, sample_paper
    ):
        """Test processing multiple issues."""
        # Setup mock response with multiple issues
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value=[
            sample_paper_issue,
            sample_reading_session_issue
        ])
        
        mock_session.get = Mock(return_value=AsyncContextManagerMock(mock_response))
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        # Mock commit_and_push
        with patch('scripts.process_events.commit_and_push') as mock_commit:
            await event_processor.process_all_issues()
        
        # Verify papers were processed
        paper_dir = event_processor.papers_dir / sample_paper.arxiv_id
        assert paper_dir.exists()
        
        # Verify registry was updated and changes committed
        registry_file = event_processor.papers_dir.parent / "papers.yaml"
        assert registry_file.exists()
        mock_commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_open_issues(self, event_processor, mock_session):
        """Test fetching open issues."""
        # Setup mock response with different issue types
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value=[
            {"labels": [{"name": "paper"}]},
            {"labels": [{"name": "reading-session"}]},
            {"labels": [{"name": "other"}]}
        ])
        
        mock_session.get = Mock(return_value=AsyncContextManagerMock(mock_response))
        
        issues = await event_processor.get_open_issues(mock_session)
        
        # Should only get paper and reading-session issues
        assert len(issues) == 2
        assert all(
            any(label["name"] in ["paper", "reading-session"] 
                for label in issue["labels"]) 
            for issue in issues
        )

    @pytest.mark.asyncio
    async def test_error_handling(self, event_processor, mock_session, mock_arxiv_api):
        """Test error handling during event processing."""
        # Setup ArXiv API to fail
        mock_arxiv_api.fetch_metadata.side_effect = Exception("ArXiv API Error")
        
        # Create issue with invalid data
        invalid_issue = {
            "number": 1,
            "html_url": "https://github.com/user/repo/issues/1",
            "state": "open",
            "labels": [{"name": "paper"}],
            "body": "invalid json"
        }
        
        # Attempt to process invalid issue
        result = await event_processor.process_new_paper(invalid_issue)
        assert not result
        
        # Verify no files were created
        assert len(list(event_processor.papers_dir.iterdir())) == 0

    @pytest.mark.asyncio
    async def test_registry_update(self, event_processor, sample_paper, mock_arxiv_api):
        """Test updating the central registry."""
        mock_arxiv_api.fetch_metadata.return_value = sample_paper
        
        # Create some papers
        paper_dir = event_processor.papers_dir / sample_paper.arxiv_id
        paper_dir.mkdir(parents=True)
        event_processor.paper_manager.save_metadata(sample_paper)
        
        # Update registry (using temp directory)
        registry_file = event_processor.papers_dir.parent / "papers.yaml"
        event_processor.registry_file = registry_file  # Override default path
        
        # Update registry
        event_processor.update_registry()
        
        # Verify registry file
        assert registry_file.exists()
        with registry_file.open() as f:
            registry_data = yaml.safe_load(f)
            assert sample_paper.arxiv_id in registry_data
            
        # Verify registry file was tracked
        assert str(registry_file) in event_processor.paper_manager.get_modified_files()
        
        # Clear modified files
        event_processor.paper_manager.clear_modified_files()
        assert len(event_processor.paper_manager.get_modified_files()) == 0
