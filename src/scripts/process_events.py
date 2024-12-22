# src/scripts/process_events.py
import os
import json
import yaml
import asyncio
import aiohttp
from pathlib import Path
from datetime import datetime
from loguru import logger
from typing import List, Dict, Any

from .models import Paper, ReadingSession
from .paper_manager import PaperManager
from llamero.utils import commit_and_push

class GithubClient:
    """Handles GitHub API interactions."""
    def __init__(self, token: str, repo: str):
        self.token = token
        self.repo = repo
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }

    async def get_open_issues(self, session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
        """Fetch open issues with paper or reading-session labels."""
        url = f"https://api.github.com/repos/{self.repo}/issues"
        params = {"state": "open", "per_page": 100}
        
        async with session.get(url, headers=self.headers, params=params) as response:
            if response.status == 200:
                all_issues = await response.json()
                return [
                    issue for issue in all_issues
                    if any(label['name'] in ['paper', 'reading-session'] 
                          for label in issue['labels'])
                ]
            return []

    async def close_issue(self, session: aiohttp.ClientSession, issue_number: int) -> bool:
        """Close an issue with comment."""
        base_url = f"https://api.github.com/repos/{self.repo}/issues/{issue_number}"
        
        # Add comment
        comment_data = {"body": "✅ Event processed and recorded. Closing this issue."}
        async with session.post(f"{base_url}/comments", headers=self.headers, json=comment_data) as response:
            if response.status != 201:
                logger.error(f"Failed to add comment to issue {issue_number}")
                return False

        # Close issue
        close_data = {"state": "closed"}
        async with session.patch(base_url, headers=self.headers, json=close_data) as response:
            if response.status != 200:
                logger.error(f"Failed to close issue {issue_number}")
                return False

        return True

class EventProcessor:
    """Processes GitHub issues into paper events."""

    def __init__(self):
        self.github = GithubClient(
            token=os.environ["GITHUB_TOKEN"],
            repo=os.environ["GITHUB_REPOSITORY"]
        )
        self.papers_dir = Path("data/papers")
        self.papers_dir.mkdir(parents=True, exist_ok=True)
        self.paper_manager = PaperManager(self.papers_dir)
        self.processed_issues: list[int] = []

    def process_paper_issue(self, issue_data: Dict[str, Any]) -> bool:
        """Process paper registration issue."""
        try:
            paper_data = json.loads(issue_data["body"])
            arxiv_id = paper_data.get("arxivId")
            if not arxiv_id:
                raise ValueError("No arXiv ID found in metadata")

            paper = self.paper_manager.get_or_create_paper(arxiv_id)
            paper.issue_number = issue_data["number"]
            paper.issue_url = issue_data["html_url"]
            paper.labels = [label["name"] for label in issue_data["labels"]]
            
            self.paper_manager.save_metadata(paper)
            self.processed_issues.append(issue_data["number"])
            return True

        except Exception as e:
            logger.error(f"Error processing paper issue: {e}")
            return False

    def process_reading_issue(self, issue_data: Dict[str, Any]) -> bool:
        """Process reading session issue."""
        try:
            session_data = json.loads(issue_data["body"])
            arxiv_id = session_data.get("arxivId")
            duration = session_data.get("duration_minutes")
            
            if not arxiv_id or not duration:
                raise ValueError("Missing required fields in session data")

            event = ReadingSession(
                arxivId=arxiv_id,
                timestamp=datetime.utcnow().isoformat(),
                duration_minutes=duration,
                issue_url=issue_data["html_url"]
            )
            
            self.paper_manager.update_reading_time(arxiv_id, duration)
            self.paper_manager.append_event(arxiv_id, event)
            self.processed_issues.append(issue_data["number"])
            return True

        except Exception as e:
            logger.error(f"Error processing reading session: {e}")
            return False

    def update_registry(self) -> None:
        """Update central registry with modified papers."""
        registry_file = Path("data/papers.yaml")
        registry = {}
        
        if registry_file.exists():
            with registry_file.open('r') as f:
                registry = yaml.safe_load(f) or {}
        
        modified_papers = {
            path.parent.name 
            for path in map(Path, self.paper_manager.get_modified_files())
            if "metadata.json" in str(path)
        }
        
        for arxiv_id in modified_papers:
            try:
                paper = self.paper_manager.load_metadata(arxiv_id)
                registry[arxiv_id] = paper.model_dump(by_alias=True)
            except Exception as e:
                logger.error(f"Error adding {arxiv_id} to registry: {e}")
        
        if modified_papers:
            with registry_file.open('w') as f:
                yaml.safe_dump(registry, f, sort_keys=True, indent=2, allow_unicode=True)
            self.paper_manager.modified_files.add(str(registry_file))

    async def process_all_issues(self) -> None:
        """Process all open issues."""
        async with aiohttp.ClientSession() as session:
            # Get and process issues
            issues = await self.github.get_open_issues(session)
            for issue in issues:
                labels = [label["name"] for label in issue["labels"]]
                if "reading-session" in labels:
                    self.process_reading_issue(issue)
                elif "paper" in labels:
                    self.process_paper_issue(issue)

            # Update registry and close issues
            if self.paper_manager.get_modified_files():
                self.update_registry()
                try:
                    commit_and_push(list(self.paper_manager.get_modified_files()))
                    for issue_number in self.processed_issues:
                        await self.github.close_issue(session, issue_number)
                except Exception as e:
                    logger.error(f"Failed to commit changes: {e}")
                finally:
                    self.paper_manager.clear_modified_files()

def main():
    """Main entry point for processing paper events."""
    processor = EventProcessor()
    asyncio.run(processor.process_all_issues())

if __name__ == "__main__":
    main()
