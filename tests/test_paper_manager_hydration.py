# tests/test_paper_manager.py
import json
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

from scripts.models import Paper
from scripts.paper_manager import PaperManager


@pytest.fixture
def manager(test_dir):
    """Create PaperManager instance with test directory."""
    return PaperManager(test_dir)

@pytest.fixture
def paper_with_missing_fields(sample_paper):
    """Create paper missing optional metadata fields."""
    paper_dict = sample_paper.model_dump()
    paper_dict["published_date"] = None
    paper_dict["arxiv_tags"] = None
    return Paper.model_validate(paper_dict)

@pytest.fixture
def complete_paper(sample_paper):
    """Create paper with all metadata fields."""
    paper_dict = sample_paper.model_dump()
    paper_dict["published_date"] = "2024-01-01T00:00:00Z"
    paper_dict["arxiv_tags"] = ["cs.LG", "cs.AI"]
    return Paper.model_validate(paper_dict)

class TestPaperManagerHydration:
    def test_needs_hydration_missing_fields(self, manager, paper_with_missing_fields):
        """Test hydration check with missing fields."""
        assert manager._needs_hydration(paper_with_missing_fields)
        
    def test_needs_hydration_complete(self, manager, complete_paper):
        """Test hydration check with complete metadata."""
        assert not manager._needs_hydration(complete_paper)
        
    def test_needs_hydration_empty_tags(self, manager, complete_paper):
        """Test hydration check with empty tags list."""
        paper_dict = complete_paper.model_dump()
        paper_dict["arxiv_tags"] = []
        paper = Paper.model_validate(paper_dict)
        assert manager._needs_hydration(paper)

    def test_hydrate_metadata_success(self, manager, paper_with_missing_fields, complete_paper):
        """Test successful metadata hydration."""
        with patch.object(manager.arxiv_client, 'fetch_metadata', return_value=complete_paper):
            hydrated = manager._hydrate_metadata(paper_with_missing_fields)
            
            # Check new fields were added
            assert hydrated.published_date == complete_paper.published_date
            assert hydrated.arxiv_tags == complete_paper.arxiv_tags
            
            # Check existing fields were preserved
            assert hydrated.total_reading_time_seconds == paper_with_missing_fields.total_reading_time_seconds
            assert hydrated.issue_number == paper_with_missing_fields.issue_number

    def test_hydrate_metadata_failure(self, manager, paper_with_missing_fields):
        """Test handling of hydration failure."""
        with patch.object(manager.arxiv_client, 'fetch_metadata', side_effect=Exception("API Error")):
            result = manager._hydrate_metadata(paper_with_missing_fields)
            # Should return original paper on failure
            assert result == paper_with_missing_fields

    def test_get_paper_triggers_hydration(self, manager, paper_with_missing_fields):
        """Test that get_paper initiates hydration when needed."""
        # Save paper with missing fields
        manager.save_metadata(paper_with_missing_fields)
        
        # Mock the hydration
        complete = paper_with_missing_fields.model_copy()
        complete.published_date = "2024-01-01T00:00:00Z"
        complete.arxiv_tags = ["cs.LG"]
        
        with patch.object(manager.arxiv_client, 'fetch_metadata', return_value=complete):
            paper = manager.get_paper(paper_with_missing_fields.arxiv_id)
            assert paper.published_date is not None
            assert paper.arxiv_tags is not None
            
            # Verify metadata file was updated
            loaded = manager.load_metadata(paper.arxiv_id)
            assert loaded.published_date == complete.published_date
            assert loaded.arxiv_tags == complete.arxiv_tags

    def test_create_paper_with_hydration(self, manager, paper_with_missing_fields, complete_paper):
        """Test that create_paper performs hydration."""
        with patch.object(manager.arxiv_client, 'fetch_metadata', return_value=complete_paper):
            manager.create_paper(paper_with_missing_fields)
            
            # Load and verify metadata was hydrated
            paper = manager.load_metadata(paper_with_missing_fields.arxiv_id)
            assert paper.published_date == complete_paper.published_date
            assert paper.arxiv_tags == complete_paper.arxiv_tags
