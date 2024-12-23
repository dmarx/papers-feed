# src/scripts/github_client.py
from typing import List, Dict, Any
import requests
from loguru import logger

def patch_schema_change(issue):
    if 'duration_minutes' in issue:
        issue['duration_seconds'] = issue.pop('duraction_minutes') * 60
    return issue

class GithubClient:
    """Handles GitHub API interactions."""
    def __init__(self, token: str, repo: str):
        self.token = token
        self.repo = repo
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }

    def get_open_issues(self) -> List[Dict[str, Any]]:
        """Fetch open issues with paper or reading-session labels."""
        url = f"https://api.github.com/repos/{self.repo}/issues"
        params = {"state": "open", "per_page": 100}
        outv=[]
        response = requests.get(url, headers=self.headers, params=params, timeout=30)
        if response.status_code == 200:
            all_issues = response.json()
            outv = [
                patch_schema_change(issue) for issue in all_issues
                if any(label['name'] in ['paper', 'reading-session'] 
                      for label in issue['labels'])
            ]
        return outv

    def close_issue(self, issue_number: int) -> bool:
        """Close an issue with comment."""
        base_url = f"https://api.github.com/repos/{self.repo}/issues/{issue_number}"
        
        # Add comment
        comment_data = {"body": "✅ Event processed and recorded. Closing this issue."}
        comment_response = requests.post(
            f"{base_url}/comments", 
            headers=self.headers, 
            json=comment_data,
            timeout=30
        )
        if comment_response.status_code != 201:
            logger.error(f"Failed to add comment to issue {issue_number}")
            return False

        # Close issue
        close_data = {"state": "closed"}
        close_response = requests.patch(
            base_url, 
            headers=self.headers, 
            json=close_data,
            timeout=30
        )
        if close_response.status_code != 200:
            logger.error(f"Failed to close issue {issue_number}")
            return False

        return True
