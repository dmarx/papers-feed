# src/scripts/process_events.py
"""
Event Processing System
======================

This module handles the processing of paper-related events through GitHub issues.

Flow:
1. GitHub issues are fetched
2. Issues are categorized (paper/reading)
3. Events are processed and stored
4. Registry is updated
5. Issues are closed

For new events, see models.py for available event types.
"""

import os
import json
import yaml
from pathlib import Path
from datetime import datetime, timedelta, timezone
from loguru import logger
from typing import Optional, List, Dict, Any

from .models import Paper, ReadingSession, PaperVisitEvent
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

            # Create visit event using original timestamp
            timestamp = paper_data.get("timestamp", datetime.now(timezone.utc).isoformat())
            event = PaperVisitEvent(
                arxiv_id=arxiv_id,
                timestamp=timestamp,
                issue_url=issue_data["html_url"]
            )
            
            # Update paper metadata
            paper = self.paper_manager.get_or_create_paper(arxiv_id)
            paper.issue_number = issue_data["number"]
            paper.issue_url = issue_data["html_url"]
            paper.labels = [label["name"] for label in issue_data["labels"]]
            paper.last_visited = timestamp
            
            # Save both metadata and event
            self.paper_manager.save_metadata(paper)
            self.paper_manager.append_event(arxiv_id, event)
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
            timestamp = session_data.get("timestamp")
            
            if not all([arxiv_id, duration_seconds, timestamp]):
                raise ValueError("Missing required fields in session data")

            event = ReadingSession(
                arxivId=arxiv_id,
                timestamp=timestamp,  # Use original timestamp from the event
                duration_seconds=duration_seconds,
                issue_url=issue_data["html_url"]
            )
            
            # Calculate visit end time by adding duration to timestamp
            visit_time = datetime.fromisoformat(timestamp)
            visit_end = visit_time + timedelta(seconds=duration_seconds)
            
            paper = self.paper_manager.get_or_create_paper(arxiv_id)
            paper.last_visited = visit_end.isoformat()
            self.paper_manager.save_metadata(paper)
            
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
                logger.info("Git operations successful and processed issues closed.")
                # logger.info("Setting EVENTS_PROCESSED variable to trigger deploy-and-publish workflow.")
                # os.environ["EVENTS_PROCESSED"]="true"
                # # with open(os.environ['GITHUB_ENV'], 'a') as f:
                # #     f.write('EVENTS_PROCESSED=true\n')
                print("Events processed.")
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
