# scripts/download_papers.py
import os
import asyncio
import aiohttp
import tarfile
import tempfile
import subprocess
from pathlib import Path
from loguru import logger

class ArxivDownloader:
    def __init__(self):
        self.papers_dir = Path("data/papers")
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
                        # # Ensure source directory exists and is empty
                        # if source_dir.exists():
                        #     for item in source_dir.iterdir():
                        #         if item.is_file():
                        #             item.unlink()
                        #         elif item.is_dir():
                        #             for subitem in item.rglob('*'):
                        #                 if subitem.is_file():
                        #                     subitem.unlink()
                        #             item.rmdir()
                        #     source_dir.rmdir()
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
            
            # Try to find the main tex file, or use the first one found
            main_tex = None
            for tex_file in tex_files:
                with tex_file.open('r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if r'\documentclass' in content:
                        main_tex = tex_file
                        break
            
            if not main_tex:
                main_tex = tex_files[0]
            
            logger.info(f"Converting {main_tex.name} to Markdown for {arxiv_id}")
            
            result = subprocess.run([
                'pandoc',
                '-f', 'latex',
                '-t', 'markdown',
                '--wrap=none',
                '--atx-headers',
                str(main_tex),
                '-o', str(markdown_file)
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"Pandoc conversion failed for {arxiv_id}: {result.stderr}")
                return False
            
            logger.success(f"Successfully converted {arxiv_id} to Markdown")
            return True
            
        except Exception as e:
            logger.error(f"Error converting {arxiv_id} to Markdown: {e}")
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

def main():
    """Main entry point for downloading missing files."""
    downloader = ArxivDownloader()
    asyncio.run(downloader.download_all_missing())

if __name__ == "__main__":
    main()
