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
    
    def get_papers_missing_files(self) -> list[dict]:
        """Find all paper directories missing PDF, source, or markdown files."""
        missing_files = []
        
        for paper_dir in self.papers_dir.iterdir():
            if not paper_dir.is_dir():
                continue

            arxiv_id = paper_dir.name
            missing = {
                'arxiv_id': arxiv_id,
                'needs_pdf': not (paper_dir / f"{arxiv_id}.pdf").exists(),
                'needs_source': not (paper_dir / "source").exists(),
                'needs_markdown': not (paper_dir / f"{arxiv_id}.md").exists()
            }
            
            if any(missing.values()):
                missing_files.append(missing)
                
        return missing_files

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

    def convert_to_markdown(self, arxiv_id: str) -> bool:
        """Convert LaTeX source to Markdown using pandoc."""
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
            logger.info(f"Converting {main_tex.name} to Markdown for {arxiv_id}")
            
            # Log file contents for debugging
            logger.debug(f"Main TeX file contents for {arxiv_id}:")
            with open(main_tex, 'r', encoding='utf-8', errors='ignore') as f:
                tex_content = f.read()
                logger.debug(f"First 500 chars: {tex_content[:500]}")
                logger.debug(f"File size: {len(tex_content)} bytes")
            
            # Get relative paths for running pandoc
            tex_file_relative = main_tex.name
            markdown_file_relative = '../' + f"{arxiv_id}.md"
            
            # First try a simpler conversion to test if pandoc works
            test_cmd = [
                'pandoc',
                '--version'
            ]
            
            try:
                test_result = subprocess.run(
                    test_cmd,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                logger.debug(f"Pandoc version: {test_result.stdout}")
            except subprocess.TimeoutExpired:
                logger.error("Pandoc version check timed out - potential system issue")
                return False
            
            # Run pandoc with timeout
            cmd = [
                'pandoc',
                '+RTS', '-K3G', '-RTS', # worker has 7G memory, requesting 3G here
                '-f', 'latex',
                '-t', 'markdown',
                '--wrap=none',
                '--atx-headers',
                '--verbose',
                '--trace',
                tex_file_relative,
                '-o', markdown_file_relative,
            ]
            
            logger.debug(f"Running pandoc command: {' '.join(cmd)}")
            logger.debug(f"Working directory: {source_dir}")
            
            try:
                result = subprocess.run(
                    cmd, 
                    capture_output=True, 
                    text=True,
                    cwd=str(source_dir),
                    timeout=180,
                )
                
                if result.returncode != 0:
                    logger.error(f"Pandoc conversion failed for {arxiv_id}:")
                    logger.error(f"Return code: {result.returncode}")
                    logger.error(f"Stderr: {result.stderr}")
                    logger.error(f"Stdout: {result.stdout}")
                    return False
                    
                # Verify the output file has content
                if markdown_file.stat().st_size == 0:
                    logger.error(f"Generated markdown file is empty for {arxiv_id}")
                    return False
                
                logger.success(f"Successfully converted {arxiv_id} to Markdown (size: {markdown_file.stat().st_size} bytes)")
                return True
                
            except subprocess.TimeoutExpired:
                logger.error(f"Pandoc conversion timed out after 60s for {arxiv_id}")
                return False
            
        except Exception as e:
            logger.error(f"Error converting {arxiv_id} to Markdown: {e}")
            logger.exception("Full traceback:")  # This will log the full stack trace
            return False

    async def process_paper(self, session: aiohttp.ClientSession, paper_info: dict) -> bool:
        """Process a single paper's downloads and conversions."""
        arxiv_id = paper_info['arxiv_id']
        success = True
        
        if paper_info['needs_pdf']:
            pdf_success = await self.download_pdf(session, arxiv_id)
            success = success and pdf_success
            
        if paper_info['needs_source']:
            source_success = await self.download_source(session, arxiv_id)
            success = success and source_success
            
            # Only attempt markdown conversion if we got the source
            if source_success and paper_info['needs_markdown']:
                md_success = self.convert_to_markdown(arxiv_id)
                success = success and md_success
        
        return success

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
