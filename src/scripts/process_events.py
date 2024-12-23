# src/scripts/process_events.py
import os
import json
import yaml
from pathlib import Path
from datetime import datetime
from loguru import logger
from typing import Optional, List, Dict, Any

from .models import Paper, ReadingSession
from .paper_manager import PaperManager
from .github_client import GithubClient
from llamero.utils import commit_and_push

class EventProcessor:
    """Processes GitHub issues into paper events."""

    def __init__(self, papers_dir: str|Path = "data/papers"):
        """Initialize EventProcessor with GitHub credentials and paths."""
        self.github = GithubClient(
            token=os.environ["GITHUB_TOKEN"],
            repo=os.environ["GITHUB_REPOSITORY"]
        )
        self.papers_dir = Path(papers_dir)
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
            duration_seconds = session_data.get("duration_seconds")
            
            if not arxiv_id or not duration:
                raise ValueError("Missing required fields in session data")

            event = ReadingSession(
                arxivId=arxiv_id,
                timestamp=datetime.utcnow().isoformat(),
                duration_seconds=duration_seconds,
                issue_url=issue_data["html_url"]
            )
            
            self.paper_manager.update_reading_time(arxiv_id, duration_seconds)
            self.paper_manager.append_event(arxiv_id, event)
            self.processed_issues.append(issue_data["number"])
            return True

        except Exception as e:
            logger.error(f"Error processing reading session: {e}")
            return False

    def update_registry(self) -> None:
        """Update central registry with modified papers."""
        registry_file = self.papers_dir / "papers.yaml"
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

    def process_all_issues(self) -> None:
        """Process all open issues."""
        # Get and process issues
        issues = self.github.get_open_issues()
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
                    self.github.close_issue(issue_number)
            except Exception as e:
                logger.error(f"Failed to commit changes: {e}")
            finally:
                self.paper_manager.clear_modified_files()

def main():
    """Main entry point for processing paper events."""
    processor = EventProcessor()
    processor.process_all_issues()

if __name__ == "__main__":
    main()
