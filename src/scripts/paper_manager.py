# src/scripts/paper_manager.py
import json
from pathlib import Path
from loguru import logger
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from .models import Paper, ReadingSession, PaperRegistrationEvent
from .arxiv_api import ArxivAPI

class PaperManager:
    """Manages paper metadata and event storage."""

    def __init__(self, data_dir: Path):
        """
        Initialize PaperManager.

        Args:
            data_dir: Base directory for paper data
        """
        self.data_dir = data_dir
        self.arxiv_api = ArxivAPI()
        self.modified_files: set[str] = set()

    async def ensure_paper_exists(self, arxiv_id: str) -> Paper:
        """
        Ensure paper directory exists with metadata.

        Args:
            arxiv_id: The arXiv identifier

        Returns:
            Paper: The paper metadata

        Raises:
            Exception: If paper creation fails
        """
        paper_dir = self.data_dir / arxiv_id
        if not paper_dir.exists():
            try:
                # Fetch metadata from arXiv
                paper = await self.arxiv_api.fetch_metadata(arxiv_id)
                
                # Create directory and save metadata
                paper_dir.mkdir(parents=True, exist_ok=True)
                self.save_metadata(paper)
                
                # Record initial registration event
                event = PaperRegistrationEvent(
                    timestamp=datetime.utcnow().isoformat(),
                    issue_url="",  # Will be updated when GitHub issue is created
                    arxiv_id=arxiv_id
                )
                self.append_event(arxiv_id, event)
                
                logger.info(f"Created new paper directory for {arxiv_id}")
                return paper
                
            except Exception as e:
                logger.error(f"Failed to create paper {arxiv_id}: {e}")
                if paper_dir.exists():
                    paper_dir.rmdir()  # Cleanup on failure
                raise
                
        return self.load_metadata(arxiv_id)

    def save_metadata(self, paper: Paper) -> None:
        """
        Save paper metadata to file.

        Args:
            paper: Paper object to save
        """
        paper_dir = self.data_dir / paper.arxiv_id
        metadata_file = paper_dir / "metadata.json"
        paper_dir.mkdir(parents=True, exist_ok=True)
        
        metadata_file.write_text(paper.model_dump_json(indent=2))
        self.modified_files.add(str(metadata_file))

    def load_metadata(self, arxiv_id: str) -> Paper:
        """
        Load paper metadata from file.

        Args:
            arxiv_id: The arXiv identifier

        Returns:
            Paper: The paper metadata

        Raises:
            FileNotFoundError: If metadata file doesn't exist
        """
        paper_dir = self.data_dir / arxiv_id
        metadata_file = paper_dir / "metadata.json"
        if not metadata_file.exists():
            raise FileNotFoundError(f"No metadata found for paper {arxiv_id}")
        return Paper.model_validate_json(metadata_file.read_text())

    def append_event(self, arxiv_id: str, event: BaseModel) -> None:
        """
        Append an event to the paper's event log.

        Args:
            arxiv_id: The arXiv identifier
            event: Event to append
        """
        paper_dir = self.data_dir / arxiv_id
        events_file = paper_dir / "events.log"
        paper_dir.mkdir(parents=True, exist_ok=True)
        
        with events_file.open('a') as f:
            f.write(f"{event.model_dump_json()}\n")
        self.modified_files.add(str(events_file))

    def update_reading_time(self, arxiv_id: str, duration_minutes: int) -> None:
        """
        Update paper's total reading time.

        Args:
            arxiv_id: The arXiv identifier
            duration_minutes: Minutes to add to total
        """
        paper = self.load_metadata(arxiv_id)
        paper.total_reading_time_minutes += duration_minutes
        paper.last_read = datetime.utcnow().isoformat()
        self.save_metadata(paper)

    def get_modified_files(self) -> set[str]:
        """Get set of modified file paths."""
        return self.modified_files.copy()

    def clear_modified_files(self) -> None:
        """Clear the set of modified files."""
        self.modified_files.clear()
