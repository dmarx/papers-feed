# src/scripts/paper_manager.py
from pathlib import Path
from loguru import logger
from .models import Paper
from .arxiv_api import ArxivAPI

class PaperManager:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.arxiv_api = ArxivAPI()

    async def ensure_paper_exists(self, arxiv_id: str) -> Paper:
        """Ensure paper directory exists with metadata."""
        paper_dir = self.data_dir / arxiv_id
        if not paper_dir.exists():
            try:
                # Fetch metadata from arXiv
                paper = await self.arxiv_api.fetch_metadata(arxiv_id)
                
                # Create directory and save metadata
                paper_dir.mkdir(parents=True, exist_ok=True)
                self.save_metadata(paper)
                logger.info(f"Created new paper directory for {arxiv_id}")
                return paper
                
            except Exception as e:
                logger.error(f"Failed to create paper {arxiv_id}: {e}")
                raise
                
        return self.load_metadata(arxiv_id)

    def save_metadata(self, paper: Paper):
        """Save paper metadata to file."""
        paper_dir = self.data_dir / paper.arxiv_id
        metadata_file = paper_dir / "metadata.json"
        metadata_file.write_text(paper.model_dump_json(indent=2))

    def load_metadata(self, arxiv_id: str) -> Paper:
        """Load paper metadata from file."""
        paper_dir = self.data_dir / arxiv_id
        metadata_file = paper_dir / "metadata.json"
        if not metadata_file.exists():
            raise FileNotFoundError(f"No metadata found for paper {arxiv_id}")
        return Paper.model_validate_json(metadata_file.read_text())
