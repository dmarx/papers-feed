# src/scripts/markdown_service.py
"""Service for managing markdown conversions of arXiv papers."""

from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional
from loguru import logger

from .pandoc_utils import PandocConverter, create_default_config
from .tex_utils import find_main_tex_file

class MarkdownService:
    """Manages the conversion of LaTeX papers to Markdown format."""
    
    def __init__(self, papers_dir: str | Path):
        """
        Initialize MarkdownService.
        
        Args:
            papers_dir: Base directory for paper storage
        """
        self.papers_dir = Path(papers_dir)
        self.failed_conversions_file = self.papers_dir / "failed_markdown.json"
        self._load_failed_conversions()
        
    def _load_failed_conversions(self):
        """Load record of failed conversions with timestamps."""
        self.failed_conversions = {}
        if self.failed_conversions_file.exists():
            import json
            try:
                self.failed_conversions = json.loads(
                    self.failed_conversions_file.read_text()
                )
            except Exception as e:
                logger.error(f"Error loading failed conversions: {e}")
    
    def _save_failed_conversions(self):
        """Save record of failed conversions."""
        import json
        try:
            self.failed_conversions_file.write_text(
                json.dumps(self.failed_conversions, indent=2)
            )
        except Exception as e:
            logger.error(f"Error saving failed conversions: {e}")
    
    def _record_failure(self, arxiv_id: str, error: str):
        """Record a conversion failure with timestamp."""
        self.failed_conversions[arxiv_id] = {
            "last_attempt": datetime.now(timezone.utc).isoformat(),
            "error": str(error)
        }
        self._save_failed_conversions()
    
    def _clear_failure(self, arxiv_id: str):
        """Clear a failure record after successful conversion."""
        if arxiv_id in self.failed_conversions:
            del self.failed_conversions[arxiv_id]
            self._save_failed_conversions()
    
    def should_retry_conversion(self, arxiv_id: str, retry_after_hours: int = 24) -> bool:
        """
        Check if we should retry a failed conversion.
        
        Args:
            arxiv_id: Paper ID to check
            retry_after_hours: Hours to wait before retrying
            
        Returns:
            bool: True if enough time has passed to retry
        """
        if arxiv_id not in self.failed_conversions:
            return True
            
        last_attempt = datetime.fromisoformat(
            self.failed_conversions[arxiv_id]["last_attempt"]
        )
        retry_threshold = datetime.now(timezone.utc) - timedelta(hours=retry_after_hours)
        return last_attempt < retry_threshold
    
    def convert_paper(self, arxiv_id: str, force: bool = False, tex_file: Optional[Path] = None) -> bool:
        """
        Convert a paper's LaTeX source to Markdown.
        
        Args:
            arxiv_id: Paper ID to convert
            force: Force conversion even if previously failed
            tex_file: Optional specific tex file to use for conversion
        """
        try:
            # Check if we should skip conversion
            if not force:
                if not self.should_retry_conversion(arxiv_id):
                    logger.info(f"Skipping recent failed conversion for {arxiv_id}")
                    return False
                    
                paper_dir = self.papers_dir / arxiv_id
                markdown_file = paper_dir / f"{arxiv_id}.md"
                if markdown_file.exists() and markdown_file.stat().st_size > 0:
                    logger.info(f"Markdown already exists for {arxiv_id}")
                    self._clear_failure(arxiv_id)
                    return True
            
            paper_dir = self.papers_dir / arxiv_id
            source_dir = paper_dir / "source"
            markdown_file = paper_dir / f"{arxiv_id}.md"
            
            # Verify source exists
            if not source_dir.exists():
                raise FileNotFoundError(f"No source directory for {arxiv_id}")
            
            # Check metadata for main_tex_file first
            metadata_file = paper_dir / "metadata.json"
            if metadata_file.exists():
                import json
                try:
                    metadata = json.loads(metadata_file.read_text())
                    if metadata.get('main_tex_file'):
                        specified_tex = paper_dir / metadata['main_tex_file']
                        if specified_tex.exists():
                            main_tex = specified_tex
                            logger.info(f"Using main_tex_file from metadata: {main_tex}")
                        else:
                            logger.warning(f"Specified main_tex_file does not exist: {specified_tex}")
                except Exception as e:
                    logger.warning(f"Error reading metadata.json: {e}")

            # Fall back to provided tex_file or inference if needed
            if not locals().get('main_tex'):
                if tex_file is not None:
                    if not tex_file.exists():
                        raise FileNotFoundError(f"Specified tex file does not exist: {tex_file}")
                    main_tex = tex_file
                else:
                    # Find main tex file
                    tex_files = list(source_dir.rglob("*.tex"))
                    if not tex_files:
                        raise FileNotFoundError(f"No .tex files found for {arxiv_id}")
                    
                    main_tex = find_main_tex_file(tex_files, arxiv_id)
                    if not main_tex:
                        raise ValueError(f"Could not identify main tex file for {arxiv_id}")
            
            # Set up Pandoc conversion
            config = create_default_config(paper_dir)
            converter = PandocConverter(config)
            
            # Attempt conversion - will raise exception on failure
            converter.convert_tex_to_markdown(main_tex, markdown_file)
            logger.success(f"Successfully converted {arxiv_id} to Markdown")
            self._clear_failure(arxiv_id)
            return True
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error converting {arxiv_id} to Markdown: {error_msg}")
            self._record_failure(arxiv_id, error_msg)
            return False
    
    def retry_failed_conversions(self, force: bool = False):
        """
        Retry converting papers that previously failed.
        
        Args:
            force: Force retry all failed conversions regardless of timing
        """
        for arxiv_id in list(self.failed_conversions.keys()):
            if force or self.should_retry_conversion(arxiv_id):
                logger.info(f"Retrying conversion for {arxiv_id}")
                self.convert_paper(arxiv_id, force=force)

    def get_conversion_status(self, arxiv_id: str) -> dict:
        """
        Get the current conversion status for a paper.
        
        Args:
            arxiv_id: Paper ID to check
            
        Returns:
            dict: Status information including:
                - has_markdown: Whether markdown exists
                - has_source: Whether source exists
                - failed: Whether conversion previously failed
                - last_attempt: Timestamp of last attempt if failed
                - error: Error message if failed
        """
        paper_dir = self.papers_dir / arxiv_id
        return {
            "has_markdown": (paper_dir / f"{arxiv_id}.md").exists(),
            "has_source": (paper_dir / "source").exists(),
            "failed": arxiv_id in self.failed_conversions,
            "last_attempt": self.failed_conversions.get(arxiv_id, {}).get("last_attempt"),
            "error": self.failed_conversions.get(arxiv_id, {}).get("error")
        }
