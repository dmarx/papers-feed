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
    
    def find_missing_pdfs(self) -> list[str]:
        """Find papers missing PDF downloads."""
        missing = []
        for paper_dir in self.papers_dir.iterdir():
            if not paper_dir.is_dir():
                continue
            arxiv_id = paper_dir.name
            status = self.arxiv.get_paper_status(arxiv_id)
            if not status["has_pdf"]:
                missing.append(arxiv_id)
        return missing
    
    def find_missing_source(self) -> list[str]:
        """Find papers missing source files."""
        missing = []
        for paper_dir in self.papers_dir.iterdir():
            if not paper_dir.is_dir():
                continue
            arxiv_id = paper_dir.name
            status = self.arxiv.get_paper_status(arxiv_id)
            if not status["has_source"]:
                missing.append(arxiv_id)
        return missing
    
    def find_pending_markdown(self) -> list[str]:
        """Find papers with source but no markdown."""
        pending = []
        for paper_dir in self.papers_dir.iterdir():
            if not paper_dir.is_dir():
                continue
            arxiv_id = paper_dir.name
            download_status = self.arxiv.get_paper_status(arxiv_id)
            markdown_status = self.markdown.get_conversion_status(arxiv_id)
            if (download_status["has_source"] and 
                not markdown_status["has_markdown"] and 
                not markdown_status["failed"]):
                pending.append(arxiv_id)
        return pending
    
    def download_pdfs(self, force: bool = False) -> dict[str, bool]:
        """Download PDFs for papers missing them."""
        papers = self.find_missing_pdfs() if not force else [
            p.name for p in self.papers_dir.iterdir() if p.is_dir()
        ]
        results = {}
        for arxiv_id in papers:
            logger.info(f"Downloading PDF for {arxiv_id}")
            success = self.arxiv.download_pdf(arxiv_id)
            results[arxiv_id] = success
        return results
    
    def download_source(self, force: bool = False) -> dict[str, bool]:
        """Download source files for papers missing them."""
        papers = self.find_missing_source() if not force else [
            p.name for p in self.papers_dir.iterdir() if p.is_dir()
        ]
        results = {}
        for arxiv_id in papers:
            logger.info(f"Downloading source for {arxiv_id}")
            success = self.arxiv.download_source(arxiv_id)
            results[arxiv_id] = success
        return results
        
    def convert_markdown(self, force: bool = False) -> dict[str, bool]:
        """Convert papers with source to markdown."""
        # Get candidate papers
        if force:
            # On force, attempt all papers that have source files
            candidates = [
                p.name for p in self.papers_dir.iterdir() 
                if p.is_dir() and self.arxiv.get_paper_status(p.name)["has_source"]
            ]
        else:
            # Get papers with source but no markdown
            candidates = []
            for paper_dir in self.papers_dir.iterdir():
                if not paper_dir.is_dir():
                    continue
                arxiv_id = paper_dir.name
                download_status = self.arxiv.get_paper_status(arxiv_id)
                markdown_status = self.markdown.get_conversion_status(arxiv_id)
                
                if (download_status["has_source"] and not markdown_status["has_markdown"]):
                    candidates.append(arxiv_id)
        
        # Process candidates
        results = {}
        for arxiv_id in candidates:
            logger.info(f"Converting {arxiv_id} to markdown")
            try:
                success = self.markdown.convert_paper(arxiv_id, force=force)
                results[arxiv_id] = success
            except Exception as e:
                logger.error(f"Error converting {arxiv_id}: {e}")
                results[arxiv_id] = False
        
        return results
    
    def ensure_all_assets(self, force: bool = False, retry_failed: bool = True):
        """Ensure all papers have complete assets."""
        if retry_failed:
            self.markdown.retry_failed_conversions(force=force)
        
        download_results = self.download_pdfs(force)
        source_results = self.download_source(force)
        markdown_results = self.convert_markdown(force)
        
        total = len(download_results) + len(source_results) + len(markdown_results)
        success = (
            sum(download_results.values()) + 
            sum(source_results.values()) + 
            sum(markdown_results.values())
        )
        
        if total == 0:
            logger.info("All paper assets are complete")
        else:
            logger.info(f"Successfully processed {success}/{total} items")

def main():
    """Command-line interface."""
    manager = PaperAssetManager(papers_dir="data/papers")
    fire.Fire({
        'ensure': manager.ensure_all_assets,
        'download-pdfs': manager.download_pdfs,
        'download-source': manager.download_source,
        'convert-markdown': manager.convert_markdown,
        'retry-failures': lambda: manager.markdown.retry_failed_conversions(force=True),
        'status': lambda: {
            'missing_pdfs': manager.find_missing_pdfs(),
            'missing_source': manager.find_missing_source(),
            'pending_markdown': manager.find_pending_markdown(),
            'failed_markdown': list(manager.markdown.failed_conversions.keys())
        }
    })

if __name__ == "__main__":
    main()
