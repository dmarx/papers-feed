# tests/test_process_events.py
import json
import yaml
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock

from scripts.process_events import EventProcessor, GithubClient
from scripts.models import Paper

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
    """Create sample paper registration issue."""
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
def sample_reading_issue(sample_paper):
    """Create sample reading session issue."""
    return {
        "number": 2,
        "html_url": "https://github.com/user/repo/issues/2",
        "state": "open",
        "labels": [{"name": "reading-session"}],
        "body": json.dumps({
            "arxivId": sample_paper.arxiv_id,
            "timestamp": datetime.utcnow().isoformat(),
            "duration_minutes": 30
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

class TestGithubClient:
    @pytest.mark.asyncio
    async def test_get_open_issues(self):
        """Test fetching open issues."""
        client = GithubClient(token="fake_token", repo="user/repo")
        
        mock_session = AsyncMock()
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = [
            {"labels": [{"name": "paper"}]},
            {"labels": [{"name": "reading-session"}]},
            {"labels": [{"name": "other"}]}
        ]
        mock_session.__aenter__.return_value = mock_session
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        issues = await client.get_open_issues(mock_session)
        
        assert len(issues) == 2  # Only paper and reading-session issues
        assert all(
            any(label["name"] in ["paper", "reading-session"] 
                for label in issue["labels"]) 
            for issue in issues
        )

    @pytest.mark.asyncio
    async def test_close_issue(self):
        """Test closing issue with comment."""
        client = GithubClient(token="fake_token", repo="user/repo")
        
        # Mock session responses
        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session
        
        # Mock comment response
        mock_comment_response = AsyncMock()
        mock_comment_response.status = 201
        mock_session.post.return_value.__aenter__.return_value = mock_comment_response
        
        # Mock close response
        mock_close_response = AsyncMock()
        mock_close_response.status = 200
        mock_session.patch.return_value.__aenter__.return_value = mock_close_response
        
        success = await client.close_issue(mock_session, 1)
        
        assert success
        mock_session.post.assert_called_once()  # Comment added
        mock_session.patch.assert_called_once()  # Issue closed

class TestEventProcessor:
    def test_process_paper_issue(self, event_processor, sample_paper_issue, sample_paper):
        """Test processing paper registration issue."""
        with patch('scripts.paper_manager.PaperManager.get_or_create_paper', return_value=sample_paper):
            success = event_processor.process_paper_issue(sample_paper_issue)
            
            assert success
            assert sample_paper_issue["number"] in event_processor.processed_issues

    def test_process_reading_issue(self, event_processor, sample_reading_issue, sample_paper):
        """Test processing reading session issue."""
        with patch('scripts.paper_manager.PaperManager.get_or_create_paper', return_value=sample_paper), \
             patch('scripts.paper_manager.PaperManager.update_reading_time'), \
             patch('scripts.paper_manager.PaperManager.append_event'):
            
            success = event_processor.process_reading_issue(sample_reading_issue)
            assert success
            assert sample_reading_issue["number"] in event_processor.processed_issues

    def test_process_reading_issue_invalid_data(self, event_processor):
        """Test processing invalid reading session data."""
        invalid_issue = {
            "number": 1,
            "html_url": "https://github.com/user/repo/issues/1",
            "labels": [{"name": "reading-session"}],
            "body": "invalid json"
        }
        
        success = event_processor.process_reading_issue(invalid_issue)
        assert not success
        assert 1 not in event_processor.processed_issues

    def test_update_registry(self, event_processor, sample_paper, tmp_path):
        """Test updating registry file."""
        # Setup: create paper and mark as modified
        paper_dir = event_processor.papers_dir / sample_paper.arxiv_id
        paper_dir.mkdir(parents=True)
        event_processor.paper_manager.save_metadata(sample_paper)
        
        # Override registry path for testing
        registry_file = tmp_path / "papers.yaml"
        with patch('pathlib.Path', return_value=registry_file):
            # Update registry
            event_processor.update_registry()
        
            # Verify registry was updated
            assert registry_file.exists()
            
            # Verify registry content
            with registry_file.open('r') as f:
                registry_data = yaml.safe_load(f)
            assert sample_paper.arxiv_id in registry_data
            assert registry_data[sample_paper.arxiv_id]["title"] == sample_paper.title

    @pytest.mark.asyncio
    async def test_process_all_issues(self, event_processor, sample_paper_issue, sample_reading_issue):
        """Test processing multiple issue types."""
        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session
        
        # Mock issues response
        mock_issues_response = AsyncMock()
        mock_issues_response.status = 200
        mock_issues_response.json.return_value = [sample_paper_issue, sample_reading_issue]
        mock_session.get.return_value.__aenter__.return_value = mock_issues_response
        
        # Mock issue closing responses
        mock_success_response = AsyncMock()
        mock_success_response.status = 200
        mock_session.post.return_value.__aenter__.return_value = mock_success_response
        mock_session.patch.return_value.__aenter__.return_value = mock_success_response
        
        with patch('aiohttp.ClientSession', return_value=mock_session), \
             patch('scripts.paper_manager.PaperManager.get_or_create_paper'), \
             patch('scripts.process_events.commit_and_push'):
            
            await event_processor.process_all_issues()
            
            # Verify both issues were processed
            assert len(event_processor.processed_issues) == 2
            mock_session.get.assert_called_once()  # Fetched issues
            assert mock_session.post.call_count == 2  # Added comments
            assert mock_session.patch.call_count == 2  # Closed issues

    @pytest.mark.asyncio
    async def test_process_no_issues(self, event_processor):
        """Test behavior when no issues exist."""
        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = []
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            await event_processor.process_all_issues()
            assert len(event_processor.processed_issues) == 0

    @pytest.mark.asyncio
    async def test_github_api_error(self, event_processor):
        """Test handling of GitHub API errors."""
        mock_session = AsyncMock()
        mock_session.__aenter__.return_value = mock_session
        
        mock_response = AsyncMock()
        mock_response.status = 404
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            await event_processor.process_all_issues()
            assert len(event_processor.processed_issues) == 0
