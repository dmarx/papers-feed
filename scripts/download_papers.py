# scripts/download_papers.py
import os
import asyncio
import aiohttp
import json
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from loguru import logger
from urllib.parse import urlparse

class PDFDownloader:
    """Downloads missing PDFs for papers in the data directory."""
    
    def __init__(self):
        self.papers_dir = Path("data/papers")
        self.rate_limit = asyncio.Semaphore(1)  # Only 1 concurrent download
        self.delay = 3  # 3 second delay between downloads
        self.headers = {
            'User-Agent': 'ArxivPaperTracker/1.0 (Contact: YOUR_EMAIL)'  # Replace with your contact
        }
    
    def get_papers_missing_pdfs(self) -> List[dict]:
        """Find all paper directories that don't have a PDF file."""
        missing_pdfs = []
        
        for paper_dir in self.papers_dir.iterdir():
            if not paper_dir.is_dir():
                continue
                
            # Check for metadata.json
            metadata_file = paper_dir / "metadata.json"
            if not metadata_file.exists():
                continue
                
            # Check if PDF already exists
            pdf_file = paper_dir / f"{paper_dir.name}.pdf"
            if pdf_file.exists():
                continue
                
            # Load metadata
            try:
                with metadata_file.open('r') as f:
                    metadata = json.load(f)
                missing_pdfs.append(metadata)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse metadata for {paper_dir.name}")
                continue
        
        return missing_pdfs

    def get_pdf_url(self, arxiv_url: str) -> Optional[str]:
        """Convert arXiv abstract URL to PDF URL."""
        try:
            parsed = urlparse(arxiv_url)
            if not parsed.path:
                return None
                
            # Handle different URL formats
            if '/abs/' in arxiv_url:
                arxiv_id = parsed.path.split('/abs/')[-1]
                return f"https://arxiv.org/pdf/{arxiv_id}.pdf"
            elif '/pdf/' in arxiv_url:
                return arxiv_url
            else:
                arxiv_id = parsed.path.split('/')[-1]
                return f"https://arxiv.org/pdf/{arxiv_id}.pdf"
        except Exception as e:
            logger.error(f"Failed to parse arXiv URL {arxiv_url}: {e}")
            return None

    async def download_pdf(self, session: aiohttp.ClientSession, paper: dict) -> bool:
        """Download PDF for a single paper with rate limiting."""
        async with self.rate_limit:
            try:
                arxiv_id = paper['arxivId']
                pdf_url = self.get_pdf_url(paper['url'])
                if not pdf_url:
                    logger.error(f"Could not generate PDF URL for {arxiv_id}")
                    return False

                paper_dir = self.papers_dir / arxiv_id
                pdf_path = paper_dir / f"{arxiv_id}.pdf"
                
                logger.info(f"Downloading PDF for {arxiv_id}")
                async with session.get(pdf_url, headers=self.headers) as response:
                    if response.status != 200:
                        logger.error(f"Failed to download PDF for {arxiv_id}: {response.status}")
                        return False
                        
                    content = await response.read()
                    pdf_path.write_bytes(content)
                    
                logger.success(f"Successfully downloaded PDF for {arxiv_id}")
                await asyncio.sleep(self.delay)  # Rate limiting delay
                return True
                
            except Exception as e:
                logger.error(f"Error downloading PDF for {arxiv_id}: {e}")
                return False

    async def download_all_missing(self):
        """Download PDFs for all papers that don't have them."""
        papers = self.get_papers_missing_pdfs()
        if not papers:
            logger.info("No papers missing PDFs")
            return

        logger.info(f"Found {len(papers)} papers missing PDFs")
        async with aiohttp.ClientSession() as session:
            tasks = [self.download_pdf(session, paper) for paper in papers]
            results = await asyncio.gather(*tasks)
            
            success_count = sum(1 for r in results if r)
            logger.info(f"Successfully downloaded {success_count}/{len(papers)} PDFs")

def main():
    """Main entry point for downloading missing PDFs."""
    downloader = PDFDownloader()
    asyncio.run(downloader.download_all_missing())

if __name__ == "__main__":
    main()
