# tests/test_process_events.py
import json
import pytest
import yaml
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock, MagicMock

from scripts.process_events import EventProcessor
from scripts.models import Paper, ReadingSession, PaperRegistrationEvent

class AsyncContextManagerMock:
    """Mock for async context managers."""
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
def sample_paper_issue(sample_paper):
    """Create sample paper issue data."""
    return {
        "number": 1,
        "html_url": "https://github.com/user/repo/issues/1",
        "state": "open",
        "labels": [{"name": "paper"}],
        "body": json.dumps({
            "arxivId": sample_paper.arxiv_id,
            "title": sample_paper.title,
            "authors": sample_paper.authors,
            "abstract": sample_paper.abstract,
            "url": sample_paper.url
        })
    }

@pytest.fixture
def event_processor(tmp_path):
    """Create EventProcessor with temp directory."""
    with patch.dict('os.environ', {
        'GITHUB_TOKEN': 'fake_token',
        'GITHUB_REPOSITORY': 'user/repo'
    }):
        processor = EventProcessor()
        processor.papers_dir = tmp_path / "papers"
        processor.papers_dir.mkdir(parents=True)
        return processor

class TestEventProcessor:
    def test_process_new_paper(self, event_processor, sample_paper_issue, sample_paper):
        """Test processing new paper issue."""
        with patch('scripts.paper_manager.PaperManager.get_or_create_paper', return_value=sample_paper):
            success = event_processor.process_new_paper(sample_paper_issue)
            
            assert success
            assert sample_paper_issue["number"] in event_processor.processed_issues

    def test_process_reading_session(self, event_processor, sample_paper):
        """Test processing reading session issue."""
        issue_data = {
            "number": 2,
            "html_url": "https://github.com/user/repo/issues/2",
            "labels": [{"name": "reading-session"}],
            "body": json.dumps({
                "arxivId": sample_paper.arxiv_id,
                "timestamp": datetime.utcnow().isoformat(),
                "duration_minutes": 30
            })
        }
        
        with patch('scripts.paper_manager.PaperManager.get_or_create_paper', return_value=sample_paper), \
             patch('scripts.paper_manager.PaperManager.update_reading_time'), \
             patch('scripts.paper_manager.PaperManager.append_event'):
            
            success = event_processor.process_reading_session(issue_data)
            assert success
            assert issue_data["number"] in event_processor.processed_issues

    @pytest.mark.asyncio
    async def test_get_open_issues(self, event_processor, mock_session):
        """Test fetching open issues."""
        issue_list = [
            {"labels": [{"name": "paper"}]},
            {"labels": [{"name": "reading-session"}]},
            {"labels": [{"name": "other"}]}
        ]
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value=issue_list)
        mock_session.get = Mock(return_value=AsyncContextManagerMock(mock_response))

        issues = await event_processor.get_open_issues(mock_session)
        assert len(issues) == 2  # Should only get paper and reading-session issues
        assert all(
            any(label["name"] in ["paper", "reading-session"] 
                for label in issue["labels"]) 
            for issue in issues
        )

    @pytest.mark.asyncio
    async def test_close_issues(self, event_processor, mock_session):
        """Test closing processed issues."""
        event_processor.processed_issues = [1, 2]
        
        # Mock successful responses
        mock_comment_response = AsyncMock()
        mock_comment_response.status = 201
        
        mock_close_response = AsyncMock()
        mock_close_response.status = 200
        
        mock_session.post = Mock(return_value=AsyncContextManagerMock(mock_comment_response))
        mock_session.patch = Mock(return_value=AsyncContextManagerMock(mock_close_response))
        
        await event_processor.close_issues(mock_session)
        
        # Verify API calls
        assert mock_session.post.call_count == 2  # One comment per issue
        assert mock_session.patch.call_count == 2  # One close per issue

    def test_update_registry(self, event_processor, sample_paper):
        """Test registry file updates."""
        # Create a paper and mark it as modified
        paper_dir = event_processor.papers_dir / sample_paper.arxiv_id
        paper_dir.mkdir(parents=True)
        event_processor.paper_manager.save_metadata(sample_paper)
        
        # Update registry
        event_processor.update_registry()
        
        # Verify registry file
        registry_file = Path("data/papers.yaml")
        assert registry_file.exists()
        
        with registry_file.open('r') as f:
            registry_data = yaml.safe_load(f)
        
        assert sample_paper.arxiv_id in registry_data
        assert registry_data[sample_paper.arxiv_id]["title"] == sample_paper.title
        
        # Verify registry file was tracked
        assert str(registry_file) in event_processor.paper_manager.get_modified_files()

    @pytest.mark.asyncio
    async def test_process_all_issues_mixed(self, event_processor, mock_session, sample_paper_issue):
        """Test processing multiple issue types."""
        mock_session = AsyncMock()
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = [
            sample_paper_issue,
            {
                "number": 2,
                "html_url": "https://github.com/user/repo/issues/2",
                "labels": [{"name": "reading-session"}],
                "body": json.dumps({
                    "arxivId": "2401.00001",
                    "timestamp": datetime.utcnow().isoformat(),
                    "duration_minutes": 30
                })
            }
        ]
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        with patch('aiohttp.ClientSession', return_value=mock_session), \
             patch('scripts.paper_manager.PaperManager.get_or_create_paper'), \
             patch('scripts.process_events.commit_and_push'):
            
            await event_processor.process_all_issues()
            assert len(event_processor.processed_issues) > 0

    def test_error_handling_invalid_paper(self, event_processor):
        """Test handling invalid paper data."""
        invalid_issue = {
            "number": 1,
            "html_url": "https://github.com/user/repo/issues/1",
            "labels": [{"name": "paper"}],
            "body": "invalid json"
        }
        
        success = event_processor.process_new_paper(invalid_issue)
        assert not success
        assert 1 not in event_processor.processed_issues

    def test_error_handling_invalid_session(self, event_processor):
        """Test handling invalid reading session data."""
        invalid_issue = {
            "number": 2,
            "html_url": "https://github.com/user/repo/issues/2",
            "labels": [{"name": "reading-session"}],
            "body": "invalid json"
        }
        
        success = event_processor.process_reading_session(invalid_issue)
        assert not success
        assert 2 not in event_processor.processed_issues

    @pytest.mark.asyncio
    async def test_github_api_errors(self, event_processor, mock_session):
        """Test handling GitHub API errors."""
        # Mock API error response
        mock_error_response = AsyncMock()
        mock_error_response.status = 404
        mock_session.get = Mock(return_value=AsyncContextManagerMock(mock_error_response))
        
        issues = await event_processor.get_open_issues(mock_session)
        assert issues == []  # Should return empty list on API error
        
    def test_concurrent_modifications(self, event_processor, sample_paper):
        """Test handling concurrent modifications to paper files."""
        # Create initial paper directory and files
        paper_dir = event_processor.papers_dir / sample_paper.arxiv_id
        paper_dir.mkdir(parents=True)
        
        with (paper_dir / "metadata.json").open('w') as f:
            f.write(sample_paper.model_dump_json())
        
        with (paper_dir / "events.log").open('w') as f:
            f.write("")
        
        # Create multiple reading sessions
        sessions = [
            {
                "number": i,
                "html_url": f"https://github.com/user/repo/issues/{i}",
                "labels": [{"name": "reading-session"}],
                "body": json.dumps({
                    "arxivId": sample_paper.arxiv_id,
                    "timestamp": f"2024-01-01T0{i}:00:00Z",
                    "duration_minutes": 30
                })
            } for i in range(1, 4)
        ]
        
        # Process sessions
        with patch('scripts.paper_manager.PaperManager.get_or_create_paper', return_value=sample_paper):
            for session in sessions:
                success = event_processor.process_reading_session(session)
                assert success

        assert len(event_processor.processed_issues) == 3
