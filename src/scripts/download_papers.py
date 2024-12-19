# src/scripts/download_papers.py
import os
import asyncio
import aiohttp
import tarfile
import tempfile
import subprocess
from pathlib import Path
from loguru import logger
from fire import Fire

from scripts.tex_utils import find_main_tex_file
from scripts.pandoc_utils import PandocConverter


class ArxivDownloader:
    def __init__(self, papers_dir: str | Path = "data/papers"):
        """
        Initialize the ArXiv paper downloader.
        
        Args:
            papers_dir: Path to store paper files, default "data/papers"
        """
        self.papers_dir = Path(papers_dir)
        self.rate_limit = asyncio.Semaphore(1)  # Only 1 concurrent download
        self.delay = 3  # 3 second delay between downloads
        self.headers = {
            'User-Agent': 'ArxivPaperTracker/1.0'
        }
        
        # Track failed markdown conversions
        self.failed_markdown_file = self.papers_dir / "failed_markdown.txt"
        self._load_failed_markdown_ids()

    def _load_failed_markdown_ids(self):
        """Load the set of arxiv IDs that previously failed markdown conversion."""
        self.failed_markdown_ids = set()
        if self.failed_markdown_file.exists():
            self.failed_markdown_ids = set(
                line.strip() 
                for line in self.failed_markdown_file.read_text().splitlines()
                if line.strip()
            )
    
    def _add_failed_markdown(self, arxiv_id: str):
        """Add an arxiv ID to the failed markdown tracking file."""
        if arxiv_id not in self.failed_markdown_ids:
            self.failed_markdown_ids.add(arxiv_id)
            with self.failed_markdown_file.open('a') as f:
                f.write(f"{arxiv_id}\n")
    
    def get_papers_missing_files(self) -> list[dict]:
        """Report current file status for each paper directory."""
        papers_status = []
        
        for paper_dir in self.papers_dir.iterdir():
            if not paper_dir.is_dir():
                continue

            arxiv_id = paper_dir.name
            source_dir = paper_dir / "source"
            
            status = {
                'arxiv_id': arxiv_id,
                'has_pdf': (paper_dir / f"{arxiv_id}.pdf").exists(),
                'has_source': source_dir.exists(),
                'has_markdown': (paper_dir / f"{arxiv_id}.md").exists(),
                'failed_markdown': arxiv_id in self.failed_markdown_ids
            }
            
            # Only include papers missing any files
            if not all([status['has_pdf'], status['has_source'], 
                       status['has_markdown'] or status['failed_markdown']]):
                papers_status.append(status)
                
        return papers_status

    async def process_paper(self, session: aiohttp.ClientSession, paper_status: dict) -> bool:
        """Process a single paper's downloads and conversions."""
        arxiv_id = paper_status['arxiv_id']
        success = True
        
        try:
            if not paper_status['has_pdf']:
                pdf_success = await self.download_pdf(session, arxiv_id)
                success = success and pdf_success
                
            if not paper_status['has_source']:
                source_success = await self.download_source(session, arxiv_id)
                success = success and source_success
            
            # Try markdown conversion if:
            # 1. Paper doesn't have markdown
            # 2. Hasn't previously failed conversion
            # 3. Has source files (either pre-existing or just downloaded successfully)
            if (not paper_status['has_markdown'] and 
                not paper_status['failed_markdown'] and
                (paper_status['has_source'] or success)):
                
                source_dir = self.papers_dir / arxiv_id / "source"
                if source_dir.exists():
                    md_success = self.convert_to_markdown(arxiv_id)
                    if not md_success:
                        self._add_failed_markdown(arxiv_id)
                    success = success and md_success
        
        except Exception as e:
            logger.error(f"Error processing paper {arxiv_id}: {e}")
            success = False
            
        return success
    
    def convert_to_markdown(self, arxiv_id: str) -> bool:
        """Convert LaTeX source to Markdown using enhanced Pandoc conversion."""
        try:
            paper_dir = self.papers_dir / arxiv_id
            source_dir = paper_dir / "source"
            markdown_file = paper_dir / f"{arxiv_id}.md"
            
            if not source_dir.exists():
                logger.error(f"Source directory not found for {arxiv_id}")
                return False
            
            # Find main tex file
            tex_files = list(source_dir.rglob('*.tex'))
            if not tex_files:
                logger.error(f"No .tex files found for {arxiv_id}")
                return False
            
            main_tex = find_main_tex_file(tex_files, arxiv_id)
            if not main_tex:
                logger.error(f"Could not identify main tex file for {arxiv_id}")
                return False
                
            logger.info(f"Converting {main_tex.name} to Markdown for {arxiv_id}")
            
            # Set up Pandoc conversion
            config = create_default_config(paper_dir)
            converter = PandocConverter(config)
            
            # Convert the file
            success = converter.convert_tex_to_markdown(main_tex, markdown_file)
            
            if not success:
                logger.error(f"Pandoc conversion failed for {arxiv_id}")
                return False
                
            if not markdown_file.exists() or markdown_file.stat().st_size == 0:
                logger.error(f"Generated markdown file is empty for {arxiv_id}")
                return False
            
            logger.success(f"Successfully converted {arxiv_id} to Markdown")
            return True
            
        except Exception as e:
            logger.error(f"Error converting {arxiv_id} to Markdown: {e}")
            return False
            
    def get_pdf_url(self, arxiv_id: str) -> str:
        """Get PDF URL from arXiv ID."""
        return f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    
    def get_source_url(self, arxiv_id: str) -> str:
        """Get source URL from arXiv ID."""
        return f"https://arxiv.org/e-print/{arxiv_id}"

    async def download_pdf(self, session: aiohttp.ClientSession, arxiv_id: str) -> bool:
        """Download PDF for a single paper."""
        async with self.rate_limit:
            try:
                pdf_url = self.get_pdf_url(arxiv_id)
                paper_dir = self.papers_dir / arxiv_id
                pdf_path = paper_dir / f"{arxiv_id}.pdf"
                
                logger.info(f"Downloading {pdf_path}")
                
                async with session.get(pdf_url, headers=self.headers) as response:
                    if response.status != 200:
                        logger.error(f"Failed to download PDF for {arxiv_id}: {response.status}")
                        return False
                        
                    content = await response.read()
                    pdf_path.write_bytes(content)
                    
                await asyncio.sleep(self.delay)  # Rate limiting delay
                return True
                
            except Exception as e:
                logger.error(f"Error downloading PDF for {arxiv_id}: {e}")
                return False

    async def download_source(self, session: aiohttp.ClientSession, arxiv_id: str) -> bool:
        """Download and extract source files for a single paper."""
        async with self.rate_limit:
            try:
                source_url = self.get_source_url(arxiv_id)
                paper_dir = self.papers_dir / arxiv_id
                source_dir = paper_dir / "source"
                
                logger.info(f"Downloading {source_dir}")
                
                async with session.get(source_url, headers=self.headers) as response:
                    if response.status != 200:
                        logger.error(f"Failed to download source for {arxiv_id}: {response.status}")
                        return False
                        
                    content = await response.read()
                    
                    # Create temporary file for the tar content
                    with tempfile.NamedTemporaryFile(suffix='.tar', delete=False) as tmp_file:
                        tmp_file.write(content)
                        tmp_file_path = tmp_file.name
                    
                    try:
                        source_dir.mkdir()
                        
                        # Extract tar file
                        try:
                            with tarfile.open(tmp_file_path) as tar:
                                def is_within_directory(directory, target):
                                    abs_directory = os.path.abspath(directory)
                                    abs_target = os.path.abspath(target)
                                    prefix = os.path.commonprefix([abs_directory, abs_target])
                                    return prefix == abs_directory

                                def safe_extract(tar, path=".", members=None):
                                    for member in tar.getmembers():
                                        member_path = os.path.join(path, member.name)
                                        if not is_within_directory(path, member_path):
                                            raise Exception("Attempted path traversal in tar file")
                                    tar.extractall(path=path, members=members)

                                safe_extract(tar, path=source_dir)
                        except tarfile.ReadError:
                            # If not a tar file, just copy it as a single file
                            main_tex = source_dir / "main.tex"
                            main_tex.write_bytes(content)
                    finally:
                        # Clean up temporary file
                        if os.path.exists(tmp_file_path):
                            os.unlink(tmp_file_path)
                    
                logger.success(f"Successfully downloaded and extracted source for {arxiv_id}")
                await asyncio.sleep(self.delay)
                return True
                
            except Exception as e:
                logger.error(f"Error downloading source for {arxiv_id}: {e}")
                return False

    async def download_all_missing(self):
        """Download and process all missing files for papers."""
        papers = self.get_papers_missing_files()
        if not papers:
            logger.info("No papers missing files")
            return

        logger.info(f"Found {len(papers)} papers with missing files")
        async with aiohttp.ClientSession() as session:
            tasks = [self.process_paper(session, paper) for paper in papers]
            results = await asyncio.gather(*tasks)
            
            success_count = sum(1 for r in results if r)
            logger.info(f"Successfully processed {success_count}/{len(papers)} papers")


def download_papers(papers_dir: str | Path = "data/papers"):
    """
    CLI entry point for downloading missing paper files.
    
    Args:
        papers_dir: Path to store paper files, default "data/papers"
    """
    downloader = ArxivDownloader(papers_dir=papers_dir)
    asyncio.run(downloader.download_all_missing())

def main():
    """CLI entry point using Fire."""
    Fire({
        'download': download_papers
    })

if __name__ == "__main__":
    main()
