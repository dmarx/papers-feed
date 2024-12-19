# src/scripts/sync_papers.py
"""CLI entry point for paper content synchronization."""
import asyncio
from pathlib import Path
from fire import Fire
from loguru import logger

from .paper_asset_manager import PaperAssetManager
from .paper_types import ProcessingConfig

def sync_papers(papers_dir: str | Path = "data/papers"):
    """
    Synchronize paper content, downloading and converting as needed.
    
    Args:
        papers_dir: Path to store paper files, default "data/papers"
    """
    config = ProcessingConfig(papers_dir=Path(papers_dir))
    manager = PaperAssetManager(config)
    asyncio.run(manager.process_all_papers())

def main():
    """CLI entry point using Fire."""
    Fire({
        'sync': sync_papers
    })

if __name__ == "__main__":
    main()
