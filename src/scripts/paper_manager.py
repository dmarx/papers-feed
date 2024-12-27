# src/scripts/paper_manager.py
"""Paper metadata management with automatic hydration of missing fields."""

import json
from pathlib import Path
from loguru import logger
from datetime import datetime, timezone
from typing import Optional

from .models import Paper, ReadingSession, PaperVisitEvent
from .arxiv_client import ArxivClient

class PaperManager:
    """Manages paper metadata and event storage."""
    _event_log_fname = "interactions.log"

    def __init__(self, data_dir: Path, arxiv_client: Optional[ArxivClient] = None):
        """Initialize PaperManager with data directory and optional ArxivClient."""
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.arxiv_client = arxiv_client or ArxivClient(data_dir)
        self.modified_files: set[str] = set()

    def _needs_hydration(self, paper: Paper) -> bool:
        """Check if paper needs metadata hydration."""
        return (
            paper.published_date is None or 
            paper.arxiv_tags is None or
            not paper.arxiv_tags  # Also hydrate if tags list is empty
        )
    
    def _hydrate_metadata(self, paper: Paper) -> Paper:
        """Fetch missing metadata from arXiv API."""
        try:
            # Get fresh metadata from arXiv
            updated_paper = self.arxiv_client.fetch_metadata(paper.arxiv_id)
            
            # Keep track of fields we want to preserve from the existing paper
            preserve_fields = [
                "issue_number", "issue_url", "state", "labels",
                "total_reading_time_seconds", "last_read", "last_visited",
                "main_tex_file"
            ]
            
            # Update our paper with new metadata while preserving existing fields
            updated_dict = updated_paper.model_dump()
            paper_dict = paper.model_dump()
            
            for field in preserve_fields:
                if paper_dict.get(field) is not None:
                    updated_dict[field] = paper_dict[field]
            
            # Create new paper instance with combined data
            hydrated_paper = Paper.model_validate(updated_dict)
            logger.info(f"Hydrated metadata for {paper.arxiv_id}")
            return hydrated_paper
            
        except Exception as e:
            logger.error(f"Failed to hydrate metadata for {paper.arxiv_id}: {e}")
            return paper  # Return original paper if hydration fails
    
    def get_paper(self, arxiv_id: str) -> Paper:
        """Get paper metadata, hydrating if necessary."""
        paper = self.load_metadata(arxiv_id)
        
        if self._needs_hydration(paper):
            logger.info(f"Missing metadata fields for {arxiv_id}, hydrating...")
            paper = self._hydrate_metadata(paper)
            self.save_metadata(paper)
        
        return paper

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
            
            # Check if we need to hydrate metadata before saving
            if self._needs_hydration(paper):
                paper = self._hydrate_metadata(paper)
            
            self.save_metadata(paper)

            # Record visit event with paper's timestamp
            event = PaperVisitEvent(
                timestamp=paper.created_at,  # Use paper's creation timestamp
                issue_url=paper.issue_url,
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
        if self._needs_hydration(paper):
            logger.warning(f"Saving paper {paper.arxiv_id} with missing metadata fields")
            
        paper_dir = self.data_dir / paper.arxiv_id
        metadata_file = paper_dir / "metadata.json"
        paper_dir.mkdir(parents=True, exist_ok=True)
        
        # Convert to dict and store
        data = paper.model_dump(by_alias=True)
        # Ensure relative paths for main_tex_file
        if data.get('main_tex_file'):
            try:
                # Convert to relative path from paper directory
                full_path = Path(data['main_tex_file'])
                rel_path = full_path.relative_to(paper_dir)
                data['main_tex_file'] = str(rel_path)
            except ValueError:
                # If path is already relative or invalid, store as-is
                pass
                
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
            data = json.load(f)
            # Convert relative main_tex_file path to absolute if it exists
            if data.get('main_tex_file'):
                data['main_tex_file'] = str(paper_dir / data['main_tex_file'])
            return Paper.model_validate(data)

    def append_event(self, arxiv_id: str, event: PaperVisitEvent | ReadingSession) -> None:
        """Append event to paper's event log."""
        paper_dir = self.data_dir / arxiv_id
        paper_dir.mkdir(parents=True, exist_ok=True)
        
        # Create and write to events file
        events_file = paper_dir / self._event_log_fname
        with events_file.open('a+', encoding='utf-8') as f:
            f.write(f"{event.model_dump_json()}\n")
        self.modified_files.add(str(events_file))

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
        
    def update_main_tex_file(self, arxiv_id: str, tex_file: Path) -> None:
        """Update paper's main TeX file path."""
        paper = self.get_paper(arxiv_id)
        paper.main_tex_file = str(tex_file)
        self.save_metadata(paper)
        
        # Check if markdown exists
        paper_dir = self.data_dir / arxiv_id
        markdown_file = paper_dir / f"{arxiv_id}.md"
        
        if not markdown_file.exists() or markdown_file.stat().st_size == 0:
            # Attempt conversion with specified tex file
            from .markdown_service import MarkdownService
            service = MarkdownService(self.data_dir)
            service.convert_paper(arxiv_id, force=True, tex_file=tex_file)
