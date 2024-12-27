# tests/test_process_events.py
import json
import yaml
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

from scripts.process_events import EventProcessor
from scripts.models import Paper


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
    def test_process_paper_issue(self, event_processor, sample_paper_issue, sample_paper):
        """Test processing paper registration issue."""
        with patch('scripts.paper_manager.PaperManager.get_or_create_paper', return_value=sample_paper):
            success = event_processor.process_paper_issue(sample_paper_issue)
            
            assert success
            assert sample_paper_issue["number"] in event_processor.processed_issues

    def test_process_reading_issue(self, event_processor, sample_paper):
        """Test processing reading session issue."""
        issue_data = {
            "number": 2,
            "html_url": "https://github.com/user/repo/issues/2",
            "labels": [{"name": "reading-session"}],
            "body": json.dumps({
                "arxivId": sample_paper.arxiv_id,
                "timestamp": datetime.utcnow().isoformat(),
                "duration_seconds": 30
            })
        }
        
        with patch('scripts.paper_manager.PaperManager.get_or_create_paper', return_value=sample_paper), \
             patch('scripts.paper_manager.PaperManager.update_reading_time'), \
             patch('scripts.paper_manager.PaperManager.append_event'):
            
            success = event_processor.process_reading_issue(issue_data)
            assert success
            assert issue_data["number"] in event_processor.processed_issues

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
        
        event_processor.update_registry()
        
        registry_file = event_processor.papers_dir / "papers.yaml"
        assert registry_file.exists()
        with registry_file.open() as f:
            registry_data = yaml.safe_load(f)
        assert sample_paper.arxiv_id in registry_data

    def test_process_all_issues(self, event_processor, sample_paper_issue):
        """Test processing multiple issue types."""
        with patch('scripts.github_client.GithubClient.get_open_issues') as mock_get_issues, \
             patch('scripts.github_client.GithubClient.close_issue') as mock_close_issue, \
             patch('scripts.paper_manager.PaperManager.get_or_create_paper') as mock_get_paper, \
             patch('scripts.process_events.commit_and_push'):
            
            # Configure mocks
            mock_get_issues.return_value = [sample_paper_issue]
            mock_close_issue.return_value = True
            
            # Parse JSON from issue body
            issue_data = json.loads(sample_paper_issue["body"])
            mock_get_paper.return_value = Paper(
                arxivId=issue_data["arxivId"],
                title=issue_data["title"],
                authors=issue_data["authors"], 
                abstract=issue_data["abstract"],
                url=issue_data["url"],
                issue_number=sample_paper_issue["number"],
                issue_url=sample_paper_issue["html_url"],
                created_at=datetime.utcnow().isoformat(),
                state="open",
                labels=["paper"],
                total_reading_time_seconds=0,
                last_read=None
            )
            
            event_processor.process_all_issues()
            
            assert len(event_processor.processed_issues) == 1
            mock_get_issues.assert_called_once()
            mock_close_issue.assert_called_once()
            mock_get_paper.assert_called_once()

    def test_process_no_issues(self, event_processor):
        """Test behavior when no issues exist."""
        with patch('scripts.github_client.GithubClient.get_open_issues') as mock_get_issues:
            mock_get_issues.return_value = []
            
            event_processor.process_all_issues()
            assert len(event_processor.processed_issues) == 0
            mock_get_issues.assert_called_once()

    def test_github_api_error(self, event_processor):
        """Test handling of GitHub API errors."""
        with patch('scripts.github_client.GithubClient.get_open_issues') as mock_get_issues:
            mock_get_issues.return_value = []  # API error returns empty list
            
            event_processor.process_all_issues()
            assert len(event_processor.processed_issues) == 0
