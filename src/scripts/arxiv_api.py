# src/scripts/arxiv_api.py
import time
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from loguru import logger
from typing import Optional

from .models import Paper

class ArxivAPI:
    """Client for interacting with the arXiv API."""

    def __init__(self):
        """Initialize ArxivAPI with rate limiting controls."""
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

    def fetch_metadata(self, arxiv_id: str) -> Paper:
        """
        Fetch paper metadata from arXiv API.

        Args:
            arxiv_id: The arXiv identifier

        Returns:
            Paper: Constructed Paper object

        Raises:
            ValueError: If the API response is invalid
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
        try:
            # Parse XML
            root = ET.fromstring(xml_text)
            
            # ArXiv API uses Atom namespace
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            
            # Find the entry element
            entry = root.find('.//atom:entry', ns)
            if entry is None:
                raise ValueError(f"No entry found for {arxiv_id}")

            # Extract basic metadata
            title_elem = entry.find('atom:title', ns)
            title = title_elem.text.strip() if title_elem is not None else ""

            summary_elem = entry.find('atom:summary', ns)
            abstract = summary_elem.text.strip() if summary_elem is not None else ""

            # Extract authors
            author_names = []
            for author in entry.findall('.//atom:author/atom:name', ns):
                if author.text:
                    author_names.append(author.text.strip())
            authors = ", ".join(author_names)

            # Extract links
            pdf_url = None
            html_url = None
            for link in entry.findall('atom:link', ns):
                href = link.get('href', '')
                if href.endswith('pdf'):
                    pdf_url = href
                elif '/abs/' in href:
                    html_url = href

            # Construct Paper object
            return Paper(
                arxivId=arxiv_id,
                title=title,
                authors=authors,
                abstract=abstract,
                url=html_url or f"https://arxiv.org/abs/{arxiv_id}",
                issue_number=0,  # Will be set when creating GitHub issue
                issue_url="",    # Will be set when creating GitHub issue
                created_at=datetime.utcnow().isoformat(),
                state="open",
                labels=["paper"],
                total_reading_time_seconds=0,
                last_read=None
            )

        except ET.ParseError as e:
            logger.error(f"XML parsing error for {arxiv_id}: {e}")
            raise ValueError(f"Invalid XML response from arXiv API: {e}")
        except Exception as e:
            logger.error(f"Error parsing arXiv response: {e}")
            raise
