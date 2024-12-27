# src/scripts/arxiv_client.py
"""Client for interacting with arXiv API and downloading papers."""

import os
import time
import shutil
import tarfile
import tempfile
import requests
from pathlib import Path
from datetime import datetime
from typing import Optional
from loguru import logger

from .models import Paper

class ArxivClient:
    """Client for interacting with arXiv API and downloading papers."""
    
    def __init__(self, papers_dir: str | Path):
        """
        Initialize ArxivClient.
        
        Args:
            papers_dir: Base directory for paper storage
        """
        self.papers_dir = Path(papers_dir)
        self.papers_dir.mkdir(parents=True, exist_ok=True)
        
        # Rate limiting controls
        self.last_request = 0
        self.min_delay = 3  # Seconds between requests
        self.headers = {'User-Agent': 'ArxivPaperTracker/1.0'}
        self.api_base = "http://export.arxiv.org/api/query"
    
    def _wait_for_rate_limit(self):
        """Enforce rate limiting between requests."""
        now = time.time()
        time_since_last = now - self.last_request
        if time_since_last < self.min_delay:
            time.sleep(self.min_delay - time_since_last)
        self.last_request = time.time()
    
    def get_paper_dir(self, arxiv_id: str) -> Path:
        """Get paper's directory, creating if needed."""
        paper_dir = self.papers_dir / arxiv_id
        paper_dir.mkdir(parents=True, exist_ok=True)
        return paper_dir
    
    def get_paper_status(self, arxiv_id: str) -> dict:
        """
        Get current status of paper downloads.
        
        Returns:
            dict with keys:
                - has_pdf: Whether PDF exists
                - has_source: Whether source exists
                - pdf_size: Size of PDF if it exists
                - source_size: Size of source directory if it exists
        """
        paper_dir = self.papers_dir / arxiv_id
        pdf_file = paper_dir / f"{arxiv_id}.pdf"
        source_dir = paper_dir / "source"
        
        return {
            "has_pdf": pdf_file.exists(),
            "has_source": source_dir.exists(),
            "pdf_size": pdf_file.stat().st_size if pdf_file.exists() else 0,
            "source_size": sum(
                f.stat().st_size for f in source_dir.rglob('*') if f.is_file()
            ) if source_dir.exists() else 0
        }
    
    def fetch_metadata(self, arxiv_id: str) -> Paper:
        """
        Fetch paper metadata from arXiv API.
        
        Args:
            arxiv_id: The arXiv identifier
            
        Returns:
            Paper: Constructed Paper object
            
        Raises:
            ValueError: If API response is invalid
            Exception: For network or parsing errors
        """
        self._wait_for_rate_limit()
        
        try:
            url = f"{self.api_base}?id_list={arxiv_id}"
            logger.debug(f"Fetching arXiv metadata: {url}")
            
            response = requests.get(url, headers=self.headers, timeout=30)
            if response.status_code != 200:
                raise ValueError(f"ArXiv API error: {response.status_code}")
            
            return self._parse_arxiv_response(response.text, arxiv_id)
                
        except Exception as e:
            logger.error(f"Error fetching arXiv metadata for {arxiv_id}: {e}")
            raise
        
    def _parse_arxiv_response(self, xml_text: str, arxiv_id: str) -> Paper:
        """Parse ArXiv API response XML into Paper object."""
        import xml.etree.ElementTree as ET
        
        try:
            # Parse XML
            root = ET.fromstring(xml_text)
            
            # ArXiv API uses Atom namespace
            ns = {'atom': 'http://www.w3.org/2005/Atom',
                  'arxiv': 'http://arxiv.org/schemas/atom'}
            
            # Find the entry element
            entry = root.find('.//atom:entry', ns)
            if entry is None:
                raise ValueError(f"No entry found for {arxiv_id}")
    
            # Extract metadata
            title = entry.find('atom:title', ns).text.strip()
            abstract = entry.find('atom:summary', ns).text.strip()
            authors = ", ".join(
                author.text.strip() 
                for author in entry.findall('.//atom:author/atom:name', ns)
            )
    
            # Extract URLs
            urls = {
                link.get('title', ''): link.get('href', '')
                for link in entry.findall('atom:link', ns)
            }
            html_url = urls.get('abs', f"https://arxiv.org/abs/{arxiv_id}")
    
            # Extract published date (for v1)
            published = entry.find('atom:published', ns)
            published_date = published.text if published is not None else None
    
            # Extract arXiv categories/tags
            primary_category = entry.find('arxiv:primary_category', ns)
            categories = [
                term.get('term') 
                for term in entry.findall('atom:category', ns)
            ]
            if primary_category is not None:
                primary = primary_category.get('term')
                if primary and primary not in categories:
                    categories.insert(0, primary)
    
            # Construct Paper object
            return Paper(
                arxivId=arxiv_id,
                title=title,
                authors=authors,
                abstract=abstract,
                url=html_url,
                issue_number=0,
                issue_url="",
                created_at=datetime.utcnow().isoformat(),
                state="open",
                labels=["paper"],
                total_reading_time_seconds=0,
                last_read=None,
                published_date=published_date,
                arxiv_tags=categories
            )
    
        except ET.ParseError as e:
            logger.error(f"XML parsing error for {arxiv_id}: {e}")
            raise ValueError(f"Invalid XML response from arXiv API: {e}")
        except Exception as e:
            logger.error(f"Error parsing arXiv response: {e}")
            raise
    
    def get_pdf_url(self, arxiv_id: str) -> str:
        """Get PDF URL from arXiv ID."""
        return f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    
    def get_source_url(self, arxiv_id: str) -> str:
        """Get source URL from arXiv ID."""
        return f"https://arxiv.org/e-print/{arxiv_id}"

    def download_pdf(self, arxiv_id: str) -> bool:
        """
        Download PDF for a paper.
        
        Args:
            arxiv_id: Paper ID to download
            
        Returns:
            bool: True if successful
        """
        try:
            pdf_url = self.get_pdf_url(arxiv_id)
            paper_dir = self.get_paper_dir(arxiv_id)
            pdf_path = paper_dir / f"{arxiv_id}.pdf"
            
            if pdf_path.exists():
                logger.info(f"PDF already exists for {arxiv_id}")
                return True
            
            self._wait_for_rate_limit()
            logger.info(f"Downloading PDF: {pdf_path}")
            
            response = requests.get(pdf_url, headers=self.headers, timeout=30)
            if response.status_code != 200:
                raise ValueError(f"Failed to download PDF: {response.status_code}")
            
            pdf_path.write_bytes(response.content)
            return True
            
        except Exception as e:
            logger.error(f"Error downloading PDF for {arxiv_id}: {e}")
            return False

    def download_source(self, arxiv_id: str) -> bool:
        """
        Download and extract source files for a paper.
        
        Args:
            arxiv_id: Paper ID to download
            
        Returns:
            bool: True if successful
        """
        try:
            source_url = self.get_source_url(arxiv_id)
            paper_dir = self.get_paper_dir(arxiv_id)
            source_dir = paper_dir / "source"
            
            if source_dir.exists():
                logger.info(f"Source already exists for {arxiv_id}")
                return True
            
            self._wait_for_rate_limit()
            logger.info(f"Downloading source: {source_dir}")
            
            response = requests.get(source_url, headers=self.headers, timeout=30)
            if response.status_code != 200:
                raise ValueError(f"Failed to download source: {response.status_code}")
            
            # Create temporary file for the tar content
            with tempfile.NamedTemporaryFile(suffix='.tar', delete=False) as tmp_file:
                tmp_file.write(response.content)
                tmp_file_path = tmp_file.name
            
            try:
                source_dir.mkdir(exist_ok=True)
                
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
                    main_tex.write_bytes(response.content)
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
            
            return True
            
        except Exception as e:
            logger.error(f"Error downloading source for {arxiv_id}: {e}")
            if source_dir.exists():
                shutil.rmtree(source_dir)  # Clean up on failure
            return False

    def download_paper(self, arxiv_id: str, skip_existing: bool = True) -> bool:
        """
        Download both PDF and source files for a paper.
        
        Args:
            arxiv_id: Paper ID to download
            skip_existing: Skip downloads if files exist
            
        Returns:
            bool: True if all downloads successful
        """
        status = self.get_paper_status(arxiv_id)
        
        if skip_existing and status["has_pdf"] and status["has_source"]:
            logger.info(f"All files already exist for {arxiv_id}")
            return True
        
        if not status["has_pdf"]:
            if not self.download_pdf(arxiv_id):
                return False
        
        if not status["has_source"]:
            if not self.download_source(arxiv_id):
                return False
        
        return True
