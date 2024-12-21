# scripts/process_events.py
import os
import json
import yaml
import asyncio
import aiohttp
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field
from loguru import logger
from llamero.utils import commit_and_push

from .models import (
    Paper,
    ReadingSession,
    PaperRegistrationEvent,
)


class EventProcessor:
    def __init__(self):
        self.github_token = os.environ["GITHUB_TOKEN"]
        self.repo = os.environ["GITHUB_REPOSITORY"]
        self.base_headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        self.papers_dir = Path("data/papers")
        self.papers_dir.mkdir(parents=True, exist_ok=True)
        self.modified_files: set[str] = set()
        self.processed_issues: list[int] = []

    async def get_open_issues(self, session) -> list[dict]:
        """Fetch all open issues with paper or reading-session labels."""
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

    def create_paper_from_issue(self, issue_data: dict, paper_data: dict) -> Paper:
        """Create a Paper model from issue and paper data."""
        return Paper(
            arxivId=paper_data["arxivId"],
            title=paper_data.get("title", "Untitled"),
            authors=paper_data.get("authors", "Unknown"),
            abstract=paper_data.get("abstract", "").replace('\n', ' '),
            url=paper_data.get("url", ""),
            issue_number=issue_data["number"],
            issue_url=issue_data["html_url"],
            created_at=issue_data["created_at"],
            state=issue_data["state"],
            labels=[label["name"] for label in issue_data["labels"]],
            total_reading_time_minutes=0,
            last_read=None
        )

    def ensure_paper_directory(self, arxiv_id: str) -> Path:
        """Create paper directory if it doesn't exist."""
        paper_dir = self.papers_dir / arxiv_id
        paper_dir.mkdir(parents=True, exist_ok=True)
        return paper_dir

    def load_paper_metadata(self, arxiv_id: str) -> Paper | None:
        """Load paper metadata from file."""
        metadata_file = self.papers_dir / arxiv_id / "metadata.json"
        if metadata_file.exists():
            with metadata_file.open('r') as f:
                data = json.load(f)
                return Paper.model_validate(data)
        return None

    def save_paper_metadata(self, paper: Paper):
        """Save paper metadata to file."""
        arxiv_id = paper.arxiv_id
        metadata_file = self.papers_dir / arxiv_id / "metadata.json"
        with metadata_file.open('w') as f:
            json.dump(paper.model_dump(by_alias=True), f, indent=2)
        self.modified_files.add(str(metadata_file))

    def append_event(self, arxiv_id: str, event: BaseModel):
        """Append an event to the paper's event log."""
        events_file = self.papers_dir / arxiv_id / "events.log"
        with events_file.open('a') as f:
            f.write(f"{event.model_dump_json()}\n")
        self.modified_files.add(str(events_file))

    def process_new_paper(self, issue_data: dict) -> bool:
        """Process a new paper registration."""
        try:
            paper_data = json.loads(issue_data["body"])
            arxiv_id = paper_data.get("arxivId")
            if not arxiv_id:
                raise ValueError("No arXiv ID found in metadata")

            # Create paper model
            paper = self.create_paper_from_issue(issue_data, paper_data)
            
            # Save paper metadata
            self.ensure_paper_directory(arxiv_id)
            self.save_paper_metadata(paper)

            # Log paper creation event
            event = PaperRegistrationEvent(
                timestamp=datetime.utcnow().isoformat(),
                issue_url=issue_data["html_url"],
                arxiv_id=arxiv_id
            )
            self.append_event(arxiv_id, event)
            self.processed_issues.append(issue_data["number"])
            return True

        except Exception as e:
            logger.error(f"Error processing new paper: {e}")
            return False

    def process_reading_session(self, issue_data: dict) -> bool:
        """Process a reading session event."""
        try:
            session_data = json.loads(issue_data["body"])
            arxiv_id = session_data.get("arxivId")
            
            if not arxiv_id:
                raise ValueError("No arXiv ID found in session data")

            # Load or create paper
            paper = self.load_paper_metadata(arxiv_id)
            if not paper:
                # Create new paper entry if it doesn't exist
                paper = self.create_paper_from_issue(issue_data, session_data)
                self.ensure_paper_directory(arxiv_id)

            # Update reading time stats
            duration_minutes = session_data["duration_minutes"]
            paper.total_reading_time_minutes += duration_minutes
            paper.last_read = session_data["timestamp"]
            
            # Save updated metadata
            self.save_paper_metadata(paper)

            # Log reading session event
            event = ReadingSession(
                arxivId=arxiv_id,
                timestamp=session_data["timestamp"],
                duration_minutes=duration_minutes,
                issue_url=issue_data["html_url"]
            )
            self.append_event(arxiv_id, event)
            self.processed_issues.append(issue_data["number"])
            return True

        except Exception as e:
            logger.error(f"Error processing reading session: {e}")
            return False

    async def close_issues(self, session):
        """Close all successfully processed issues."""
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

    def update_registry(self):
        """Update the centralized registry file with any modified papers."""
        registry = {}
        registry_file = Path("data/papers.yaml")
        
        # Load existing registry if it exists
        if registry_file.exists():
            with registry_file.open('r') as f:
                registry = yaml.safe_load(f) or {}
        
        # Only update entries for modified papers
        modified_papers = {
            path.parent.name for path in map(Path, self.modified_files)
            if "metadata.json" in str(path)
        }
        
        for arxiv_id in modified_papers:
            paper = self.load_paper_metadata(arxiv_id)
            if paper:
                registry[arxiv_id] = paper.model_dump(by_alias=True)
        
        # Only save and track if we made changes
        if modified_papers:
            with registry_file.open('w') as f:
                yaml.safe_dump(registry, f, sort_keys=True, indent=2, allow_unicode=True)
            self.modified_files.add(str(registry_file))

    async def process_all_issues(self):
        """Process all open issues."""
        async with aiohttp.ClientSession() as session:
            issues = await self.get_open_issues(session)
            
            for issue in issues:
                labels = [label["name"] for label in issue["labels"]]
                
                if "reading-session" in labels:
                    self.process_reading_session(issue)
                elif "paper" in labels:
                    self.process_new_paper(issue)

            # Update centralized registry if we have any changes
            if self.modified_files:
                self.update_registry()
                try:
                    # Commit all modified files
                    commit_and_push(list(self.modified_files))
                    # Only close issues if commit was successful
                    await self.close_issues(session)
                except Exception as e:
                    logger.error(f"Failed to commit changes: {e}")

def main():
    """Main entry point for processing paper events."""
    processor = EventProcessor()
    asyncio.run(processor.process_all_issues())

if __name__ == "__main__":
    main()
