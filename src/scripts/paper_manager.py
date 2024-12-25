# src/scripts/paper_manager.py
import json
from pathlib import Path
from loguru import logger
from datetime import datetime
from typing import Optional

from .models import Paper, ReadingSession, PaperRegistrationEvent
from .arxiv_client import ArxivClient

class PaperManager:
    """Manages paper metadata and event storage."""
    _event_log_fname = "interactions.log"

    def __init__(self, data_dir: Path, arxiv_client: Optional[ArxivClient] = None):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.arxiv_client = arxiv_client or ArxivClient(data_dir)
        self.modified_files: set[str] = set()

    def get_paper(self, arxiv_id: str) -> Paper:
        """Get paper metadata if it exists."""
        return self.load_metadata(arxiv_id)

    def fetch_new_paper(self, arxiv_id: str) -> Paper:
        """Fetch paper metadata from ArXiv."""
        paper = self.arxiv_client.fetch_metadata(arxiv_id)
        self.create_paper(paper)
        return paper

    def get_or_create_paper(self, arxiv_id: str) -> Paper:
        """Get existing paper or create new one."""
        try:
            return self.get_paper(arxiv_id)
        except FileNotFoundError:
            return self.fetch_new_paper(arxiv_id)

    def create_paper(self, paper: Paper) -> None:
        """Create new paper directory and initialize metadata."""
        paper_dir = self.data_dir / paper.arxiv_id
        if paper_dir.exists():
            raise ValueError(f"Paper directory already exists: {paper.arxiv_id}")

        try:
            # Create directory and save metadata
            paper_dir.mkdir(parents=True)
            self.save_metadata(paper)

            # Record registration event
            event = PaperRegistrationEvent(
                timestamp=datetime.utcnow().isoformat(),
                issue_url="",
                arxiv_id=paper.arxiv_id
            )
            self.append_event(paper.arxiv_id, event)

        except Exception as e:
            logger.error(f"Failed to create paper {paper.arxiv_id}: {e}")
            if paper_dir.exists():
                paper_dir.rmdir()  # Cleanup on failure
            raise

    def save_metadata(self, paper: Paper) -> None:
        """Save paper metadata to file."""
        paper_dir = self.data_dir / paper.arxiv_id
        metadata_file = paper_dir / "metadata.json"
        paper_dir.mkdir(parents=True, exist_ok=True)
        
        # Convert to dict and store
        data = paper.model_dump(by_alias=True)
        with metadata_file.open('w') as f:
            json.dump(data, f, indent=2)
        self.modified_files.add(str(metadata_file))

    def load_metadata(self, arxiv_id: str) -> Paper:
        """Load paper metadata from file."""
        paper_dir = self.data_dir / arxiv_id
        metadata_file = paper_dir / "metadata.json"
        if not metadata_file.exists():
            raise FileNotFoundError(f"No metadata found for paper {arxiv_id}")
        
        with metadata_file.open('r') as f:
            return Paper.model_validate_json(f.read())

    def append_event(self, arxiv_id: str, event: PaperRegistrationEvent | ReadingSession) -> None:
        """Append event to paper's event log."""
        paper_dir = self.data_dir / arxiv_id
        paper_dir.mkdir(parents=True, exist_ok=True)
    
        # Create and write to events file
        events_file = paper_dir / self._event_log_fname
        logger.info(f"Appending event to {events_file.absolute()}")
        with events_file.open('a+', encoding='utf-8') as f:
            f.write(f"{event.model_dump_json()}\n")
        self.modified_files.add(str(events_file))
        logger.info(f"exists? {events_file.exists()}")

    def update_reading_time(self, arxiv_id: str, duration_seconds: int) -> None:
        """Update paper's total reading time."""
        paper = self.get_or_create_paper(arxiv_id)
        paper.total_reading_time_seconds += duration_seconds
        paper.last_read = datetime.utcnow().isoformat()
        self.save_metadata(paper)

    def get_modified_files(self) -> set[str]:
        """Get set of modified file paths."""
        return self.modified_files.copy()

    def clear_modified_files(self) -> None:
        """Clear set of modified files."""
        self.modified_files.clear()
