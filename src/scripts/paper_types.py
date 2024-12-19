# src/scripts/paper_types.py
"""Type definitions for paper asset management."""
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

@dataclass
class PaperAsset:
    """Represents a paper's assets and their states."""
    arxiv_id: str
    has_pdf: bool = False
    has_source: bool = False
    has_markdown: bool = False
    failed_markdown: bool = False
    
    def needs_processing(self) -> bool:
        """Check if paper needs any processing."""
        return (not self.has_pdf or 
                not self.has_source or 
                (not self.has_markdown and not self.failed_markdown))

@dataclass
class ProcessingConfig:
    """Configuration for paper processing."""
    papers_dir: Path
    download_rate_limit: int = 1  # Concurrent downloads
    download_delay: float = 3.0  # Seconds between downloads
    headers: dict[str, str] = None
    
    def __post_init__(self):
        if self.headers is None:
            self.headers = {'User-Agent': 'PaperAssetManager/1.0'}

class PaperProcessingError(Exception):
    """Base error for paper processing issues."""
    pass

class DownloadError(PaperProcessingError):
    """Failed to download paper assets."""
    pass

class ConversionError(PaperProcessingError):
    """Failed to convert paper content."""
    pass
