# src/scripts/process_events.py
import os
import json
import yaml
import asyncio
import aiohttp
from pathlib import Path
from datetime import datetime
from loguru import logger
from typing import Optional, List, Dict, Any

from .models import Paper, ReadingSession, PaperRegistrationEvent
from .paper_manager import PaperManager
from llamero.utils import commit_and_push

class EventProcessor:
    """Processes GitHub issues into paper events."""

    def __init__(self):
        """Initialize EventProcessor with GitHub credentials and paths."""
        self.github_token = os.environ["GITHUB_TOKEN"]
        self.repo = os.environ["GITHUB_REPOSITORY"]
        self.base_headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        self.papers_dir = Path("data/papers")
        self.papers_dir.mkdir(parents=True, exist_ok=True)
        self.paper_manager = PaperManager(self.papers_dir)
        self.processed_issues: list[int] = []

    async def get_open_issues(self, session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
        """
        Fetch all open issues with paper or reading-session labels.

        Args:
            session: aiohttp ClientSession for making requests

        Returns:
            List of issue data dictionaries
        """
        url = f"https://api.github.com/repos/{self.repo}/issues"
        params = {
            "state": "open",
            "per_page": 100
        }
        
        async with session.get(url, headers=self.base_headers, params=params) as response:
            if response.status == 200:
                all_issues = await response.json()
                return [
                    issue for issue in all_issues
                    if any(label['name'] in ['paper', 'reading-session'] 
                          for label in issue['labels'])
                ]
            return []

    async def process_new_paper(self, issue_data: Dict[str, Any]) -> bool:
        """
        Process a new paper registration.

        Args:
            issue_data: GitHub issue data

        Returns:
            bool: True if processing succeeded
        """
        try:
            paper_data = json.loads(issue_data["body"])
            arxiv_id = paper_data.get("arxivId")
            if not arxiv_id:
                raise ValueError("No arXiv ID found in metadata")

            # Ensure paper exists (fetches from arXiv if needed)
            paper = await self.paper_manager.ensure_paper_exists(arxiv_id)
            
            # Update paper with issue information
            paper.issue_number = issue_data["number"]
            paper.issue_url = issue_data["html_url"]
            paper.labels = [label["name"] for label in issue_data["labels"]]
            
            # Save updated metadata
            self.paper_manager.save_metadata(paper)
            
            self.processed_issues.append(issue_data["number"])
            return True

        except Exception as e:
            logger.error(f"Error processing new paper: {e}")
            return False

    async def process_reading_session(self, issue_data: Dict[str, Any]) -> bool:
        """
        Process a reading session event.

        Args:
            issue_data: GitHub issue data

        Returns:
            bool: True if processing succeeded
        """
        try:
            session_data = json.loads(issue_data["body"])
            arxiv_id = session_data.get("arxivId")
            
            if not arxiv_id:
                raise ValueError("No arXiv ID found in session data")

            # Ensure paper exists
            paper = await self.paper_manager.ensure_paper_exists(arxiv_id)

            # Create reading session event
            event = ReadingSession(
                arxivId=arxiv_id,
                timestamp=session_data["timestamp"],
                duration_minutes=session_data["duration_minutes"],
                issue_url=issue_data["html_url"]
            )
            
            # Update paper reading time
            self.paper_manager.update_reading_time(
                arxiv_id, 
                session_data["duration_minutes"]
            )
            
            # Log reading session event
            self.paper_manager.append_event(arxiv_id, event)
            
            self.processed_issues.append(issue_data["number"])
            return True

        except Exception as e:
            logger.error(f"Error processing reading session: {e}")
            return False

    async def close_issues(self, session: aiohttp.ClientSession) -> None:
        """
        Close all successfully processed issues.

        Args:
            session: aiohttp ClientSession for making requests
        """
        for issue_number in self.processed_issues:
            url = f"https://api.github.com/repos/{self.repo}/issues/{issue_number}"
            
            # Add comment
            comment_url = f"{url}/comments"
            comment_data = {
                "body": "✅ Event processed and recorded. Closing this issue."
            }
            async with session.post(comment_url, headers=self.base_headers, json=comment_data) as response:
                if response.status != 201:
                    logger.error(f"Failed to add comment to issue {issue_number}")
                    continue

            # Close issue
            close_data = {"state": "closed"}
            async with session.patch(url, headers=self.base_headers, json=close_data) as response:
                if response.status != 200:
                    logger.error(f"Failed to close issue {issue_number}")

    def update_registry(self) -> None:
        """Update the centralized registry file with any modified papers."""
        registry = {}
        registry_file = Path("data/papers.yaml")
        
        # Load existing registry if it exists
        if registry_file.exists():
            with registry_file.open('r') as f:
                registry = yaml.safe_load(f) or {}
        
        # Only update entries for modified papers
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
        
        # Save if we made changes
        if modified_papers:
            with registry_file.open('w') as f:
                yaml.safe_dump(registry, f, sort_keys=True, indent=2, allow_unicode=True)
            self.paper_manager.modified_files.add(str(registry_file))

    async def process_all_issues(self) -> None:
        """Process all open issues."""
        async with aiohttp.ClientSession() as session:
            issues = await self.get_open_issues(session)
            
            for issue in issues:
                labels = [label["name"] for label in issue["labels"]]
                
                if "reading-session" in labels:
                    await self.process_reading_session(issue)
                elif "paper" in labels:
                    await self.process_new_paper(issue)

            # Update registry if we have any changes
            if self.paper_manager.get_modified_files():
                self.update_registry()
                try:
                    # Commit all modified files
                    commit_and_push(list(self.paper_manager.get_modified_files()))
                    # Only close issues if commit was successful
                    await self.close_issues(session)
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
