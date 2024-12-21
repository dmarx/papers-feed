# src/scripts/arxiv_api.py
import asyncio
import aiohttp
from loguru import logger
from datetime import datetime
from .models import Paper

class ArxivAPI:
    def __init__(self):
        self.rate_limit = asyncio.Semaphore(1)
        self.headers = {'User-Agent': 'ArxivPaperTracker/1.0'}
        self.delay = 3  # Seconds between requests

    async def fetch_metadata(self, arxiv_id: str) -> Paper:
        """Fetch paper metadata from arXiv API."""
        async with self.rate_limit:
            try:
                api_url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(api_url, headers=self.headers) as response:
                        if response.status != 200:
                            raise ValueError(f"ArXiv API error: {response.status}")
                        
                        text = await response.text()
                        paper = self._parse_arxiv_response(text, arxiv_id)
                        await asyncio.sleep(self.delay)  # Rate limiting
                        return paper
                        
            except Exception as e:
                logger.error(f"Error fetching arXiv metadata for {arxiv_id}: {e}")
                raise

    def _parse_arxiv_response(self, xml_text: str, arxiv_id: str) -> Paper:
        """Parse arXiv API response XML into Paper object."""
        # Use the existing XML parsing logic from background.js
        # but adapted for Python and our Paper model
        try:
            # TODO: Implement XML parsing using xml.etree.ElementTree
            # For now returning dummy data
            return Paper(
                arxivId=arxiv_id,
                title="TODO: Parse XML",
                authors="TODO: Parse XML",
                abstract="TODO: Parse XML",
                url=f"https://arxiv.org/abs/{arxiv_id}",
                issue_number=0,
                issue_url="",
                created_at=datetime.utcnow().isoformat(),
                state="open",
                labels=["paper"],
                total_reading_time_minutes=0,
                last_read=None
            )
        except Exception as e:
            logger.error(f"Error parsing arXiv response: {e}")
            raise
