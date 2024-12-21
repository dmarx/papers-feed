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
        """Initialize PaperManager with data directory and ArXiv client."""
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.arxiv_api = ArxivAPI()
        self.modified_files: set[str] = set()

        def get_or_create_paper(self, arxiv_id: str) -> Paper:
        """
        Get or create a paper by arxiv ID.
        Creates metadata if not exists by fetching from ArXiv.
        """
        try:
            return self.ensure_paper_exists(arxiv_id)
        except FileNotFoundError:
            # Keep this async since it calls ArxivAPI
            paper = asyncio.run(self.arxiv_api.fetch_metadata(arxiv_id))
            self.create_paper(paper)
            return paper

    def create_paper(self, paper: Paper) -> None:
        """Create a new paper directory and initialize with metadata."""
        paper_dir = self.data_dir / paper.arxiv_id
        if paper_dir.exists():
            raise ValueError(f"Paper directory already exists: {paper.arxiv_id}")
            
        try:
            paper_dir.mkdir(parents=True)
            self.save_metadata(paper)
            self.append_event(
                paper.arxiv_id,
                PaperRegistrationEvent(
                    timestamp=datetime.utcnow().isoformat(),
                    issue_url="",
                    arxiv_id=paper.arxiv_id
                )
            )
            logger.info(f"Created new paper directory for {paper.arxiv_id}")
            
        except Exception as e:
            logger.error(f"Failed to create paper {paper.arxiv_id}: {e}")
            if paper_dir.exists():
                paper_dir.rmdir()
            raise

    async def ensure_paper_exists(self, arxiv_id: str) -> Paper:
        """
        Ensure paper directory exists with metadata.
        Fetches from ArXiv if needed.
        """
        paper_dir = self.data_dir / arxiv_id
        metadata_file = paper_dir / "metadata.json"
        
        if not metadata_file.exists():
            paper = await self.arxiv_api.fetch_metadata(arxiv_id)
            await self.create_paper(paper)
            return paper
            
        return self.load_metadata(arxiv_id)

    def save_metadata(self, paper: Paper) -> None:
        """Save paper metadata to file."""
        paper_dir = self.data_dir / paper.arxiv_id
        metadata_file = paper_dir / "metadata.json"
        paper_dir.mkdir(parents=True, exist_ok=True)
        
        with metadata_file.open('w') as f:
            f.write(paper.model_dump_json(indent=2))
        self.modified_files.add(str(metadata_file))

    def load_metadata(self, arxiv_id: str) -> Paper:
        """Load paper metadata from file."""
        paper_dir = self.data_dir / arxiv_id
        metadata_file = paper_dir / "metadata.json"
        if not metadata_file.exists():
            raise FileNotFoundError(f"No metadata found for paper {arxiv_id}")
        
        with metadata_file.open('r') as f:
            return Paper.model_validate_json(f.read())

    async def append_event(self, arxiv_id: str, event: BaseModel) -> None:
        """
        Append an event to the paper's event log.
        Creates paper directory if needed.
        """
        # Ensure paper exists before appending event
        await self.ensure_paper_exists(arxiv_id)
        
        # Append the event
        paper_dir = self.data_dir / arxiv_id
        events_file = paper_dir / "events.log"
        paper_dir.mkdir(parents=True, exist_ok=True)
        
        with events_file.open('a') as f:
            f.write(f"{event.model_dump_json()}\n")
        self.modified_files.add(str(events_file))

    async def update_reading_time(self, arxiv_id: str, duration_minutes: int) -> None:
        """Update paper's total reading time."""
        # First ensure paper exists
        paper = await self.ensure_paper_exists(arxiv_id)
        
        # Update reading time
        paper.total_reading_time_minutes += duration_minutes
        paper.last_read = datetime.utcnow().isoformat()
        self.save_metadata(paper)

    def get_modified_files(self) -> set[str]:
        """Get set of modified file paths."""
        return self.modified_files.copy()

    def clear_modified_files(self) -> None:
        """Clear the set of modified files."""
        self.modified_files.clear()
