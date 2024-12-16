# scripts/download_papers.py
import os
import asyncio
import aiohttp
from pathlib import Path
from loguru import logger

class PDFDownloader:
    def __init__(self):
        self.papers_dir = Path("data/papers")
        self.rate_limit = asyncio.Semaphore(1)  # Only 1 concurrent download
        self.delay = 3  # 3 second delay between downloads
        self.headers = {
            'User-Agent': 'ArxivPaperTracker/1.0'
        }
    
    def get_papers_missing_pdfs(self) -> list[str]:
        """Find all paper directories that don't have a PDF file."""
        missing_pdfs = []
        
        for paper_dir in self.papers_dir.iterdir():
            if not paper_dir.is_dir():
                continue

            pdf_file = paper_dir / f"{paper_dir.name}.pdf"
            if not pdf_file.exists():
                missing_pdfs.append(paper_dir.name)
                
        return missing_pdfs

    def get_pdf_url(self, arxiv_id: str) -> str:
        """Get PDF URL from arXiv ID."""
        return f"https://arxiv.org/pdf/{arxiv_id}.pdf"

    async def download_pdf(self, session: aiohttp.ClientSession, arxiv_id: str) -> bool:
        """Download PDF for a single paper with rate limiting."""
        async with self.rate_limit:
            try:
                pdf_url = self.get_pdf_url(arxiv_id)
                paper_dir = self.papers_dir / arxiv_id
                pdf_path = paper_dir / f"{arxiv_id}.pdf"
                
                logger.info(f"Downloading PDF for {arxiv_id}")
                
                async with await session.get(pdf_url, headers=self.headers) as response:
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
        arxiv_ids = self.get_papers_missing_pdfs()
        if not arxiv_ids:
            logger.info("No papers missing PDFs")
            return

        logger.info(f"Found {len(arxiv_ids)} papers missing PDFs")
        async with aiohttp.ClientSession() as session:
            tasks = [self.download_pdf(session, arxiv_id) for arxiv_id in arxiv_ids]
            results = await asyncio.gather(*tasks)
            
            success_count = sum(1 for r in results if r)
            logger.info(f"Successfully downloaded {success_count}/{len(arxiv_ids)} PDFs")

def main():
    """Main entry point for downloading missing PDFs."""
    downloader = PDFDownloader()
    asyncio.run(downloader.download_all_missing())

if __name__ == "__main__":
    main()
