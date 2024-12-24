# src/scripts/asset_manager.py
"""Manage paper assets including downloads, source files, and markdown conversions."""

import time
from pathlib import Path
from loguru import logger
from typing import Optional
import fire

from .arxiv_client import ArxivClient
from .markdown_service import MarkdownService

class PaperAssetManager:
    """Manages paper assets including PDFs, source files, and markdown conversions."""
    
    def __init__(self, papers_dir: str | Path, 
                 arxiv_client: Optional[ArxivClient] = None,
                 markdown_service: Optional[MarkdownService] = None):
        self.papers_dir = Path(papers_dir)
        self.papers_dir.mkdir(parents=True, exist_ok=True)
        self.arxiv = arxiv_client or ArxivClient(papers_dir)
        self.markdown = markdown_service or MarkdownService(papers_dir)
        
    def get_incomplete_assets(self) -> list[dict]:
        """
        Find papers with incomplete assets.
        
        Returns:
            List of dicts with paper asset status info
        """
        papers = []
        
        # Check each paper directory
        for paper_dir in self.papers_dir.iterdir():
            if not paper_dir.is_dir():
                continue
                
            arxiv_id = paper_dir.name
            download_status = self.arxiv.get_paper_status(arxiv_id)
            markdown_status = self.markdown.get_conversion_status(arxiv_id)
            
            # Include if missing any required assets
            if not all([
                download_status["has_pdf"], 
                download_status["has_source"],
                markdown_status["has_markdown"] or markdown_status["failed"]
            ]):
                papers.append({
                    "arxiv_id": arxiv_id,
                    **download_status,
                    **markdown_status
                })
                
        return papers
    
    def process_paper_assets(self, arxiv_id: str, force: bool = False) -> bool:
        """
        Ensure all paper assets are present and processed.
        
        Args:
            arxiv_id: Paper ID to process
            force: Force reprocessing even if assets exist
            
        Returns:
            bool: True if all assets are ready
        """
        try:
            # First ensure we have all the files
            if not self.arxiv.download_paper(arxiv_id, skip_existing=not force):
                logger.error(f"Failed to download assets for {arxiv_id}")
                return False
            
            # Then try markdown conversion
            if not self.markdown.convert_paper(arxiv_id, force=force):
                logger.error(f"Failed to convert {arxiv_id} to markdown")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error processing assets for {arxiv_id}: {e}")
            return False
    
    def ensure_all_assets(self, force: bool = False, retry_failed: bool = True):
        """
        Ensure all papers have complete assets.
        
        Args:
            force: Force reprocessing of all assets
            retry_failed: Retry failed markdown conversions
        """
        if retry_failed:
            logger.info("Retrying failed markdown conversions...")
            self.markdown.retry_failed_conversions(force=force)
        
        incomplete = self.get_incomplete_assets()
        if not incomplete:
            logger.info("All paper assets are complete")
            return
        
        logger.info(f"Found {len(incomplete)} papers with incomplete assets")
        success_count = 0
        
        for paper in incomplete:
            arxiv_id = paper["arxiv_id"]
            if self.process_paper_assets(arxiv_id, force=force):
                success_count += 1
                
        logger.info(f"Successfully completed assets for {success_count}/{len(incomplete)} papers")

def main():
    """Command-line interface."""
    manager = PaperAssetManager(papers_dir="data/papers")
    Fire({
        'ensure': manager.ensure_all_assets,
        'retry-markdown': lambda: manager.markdown.retry_failed_conversions(force=True),
        'status': lambda: manager.get_incomplete_assets()
    })

if __name__ == "__main__":
    main()
