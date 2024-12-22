# tests/test_github_client.py
import pytest
from unittest.mock import Mock, patch
from scripts.github_client import GithubClient

@pytest.fixture
def client():
    """Create GithubClient instance."""
    return GithubClient(token="fake_token", repo="user/repo")

class TestGithubClient:
    def test_get_open_issues(self, client):
        """Test fetching open issues."""
        mock_response = [
            {"labels": [{"name": "paper"}]},
            {"labels": [{"name": "reading-session"}]},
            {"labels": [{"name": "other"}]}
        ]
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            issues = client.get_open_issues()
            
            assert len(issues) == 2  # Only paper and reading-session issues
            assert all(
                any(label["name"] in ["paper", "reading-session"] 
                    for label in issue["labels"]) 
                for issue in issues
            )
            
            # Verify API call
            mock_get.assert_called_once()
            args, kwargs = mock_get.call_args
            assert "/issues" in args[0]
            assert kwargs["params"]["state"] == "open"

    def test_get_open_issues_error(self, client):
        """Test handling API errors in issue fetching."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 404
            
            issues = client.get_open_issues()
            assert issues == []  # Returns empty list on error

    def test_close_issue_success(self, client):
        """Test successful issue closing."""
        with patch('requests.post') as mock_post, \
             patch('requests.patch') as mock_patch:
            
            mock_post.return_value.status_code = 201  # Comment created
            mock_patch.return_value.status_code = 200  # Issue closed
            
            success = client.close_issue(123)
            
            assert success
            mock_post.assert_called_once()  # Comment added
            mock_patch.assert_called_once()  # Issue closed

    def test_close_issue_comment_error(self, client):
        """Test handling comment creation error."""
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 404
            
            success = client.close_issue(123)
            
            assert not success
            mock_post.assert_called_once()

    def test_close_issue_close_error(self, client):
        """Test handling issue closing error."""
        with patch('requests.post') as mock_post, \
             patch('requests.patch') as mock_patch:
            
            mock_post.return_value.status_code = 201
            mock_patch.return_value.status_code = 404
            
            success = client.close_issue(123)
            
            assert not success
            mock_post.assert_called_once()
            mock_patch.assert_called_once()
