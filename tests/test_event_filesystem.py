# tests/test_event_filesystem.py
import json
import pytest
import asyncio
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, AsyncMock
from loguru import logger

from scripts.process_events import EventProcessor
from scripts.models import ReadingSession, PaperRegistrationEvent

@pytest.fixture
def event_processor(tmp_path):
    """Create EventProcessor with temporary directory."""
    with patch.dict('os.environ', {
        'GITHUB_TOKEN': 'fake_token',
        'GITHUB_REPOSITORY': 'user/repo'
    }):
        processor = EventProcessor()
        processor.papers_dir = tmp_path / "papers"
        processor.papers_dir.mkdir(parents=True)
        return processor

@pytest.fixture
def mock_arxiv():
    """Mock ArxivAPI."""
    with patch('scripts.arxiv_api.ArxivAPI') as mock:
        mock.fetch_metadata = AsyncMock()
        yield mock

def test_event_file_creation(event_processor, tmp_path):
    """Test creation of events.log file."""
    arxiv_id = "2401.00001"
    event = ReadingSession(
        arxivId=arxiv_id,
        timestamp="2024-01-01T00:00:00Z",
        duration_minutes=30,
        issue_url="https://example.com/1"
    )
    
    # Ensure directory doesn't exist initially
    paper_dir = event_processor.papers_dir / arxiv_id
    assert not paper_dir.exists()
    
    # Create directory and write event
    paper_dir.mkdir(parents=True)
    event_processor.paper_manager.append_event(arxiv_id, event)
    
    # Verify directory and file were created
    assert paper_dir.exists()
    assert paper_dir.is_dir()
    
    events_file = paper_dir / event_processor.paper_manager._event_log_fname
    logger.info(f"target: {events_file}")
    assert events_file.exists()
    assert events_file.is_file()

def test_multiple_event_appending(event_processor, tmp_path):
    """Test appending multiple events to log file."""
    arxiv_id = "2401.00001"
    events = [
        ReadingSession(
            arxivId=arxiv_id,
            timestamp=f"2024-01-01T0{i}:00:00Z",
            duration_minutes=30,
            issue_url=f"https://example.com/{i}"
        ) for i in range(3)
    ]
    
    # Create paper directory
    paper_dir = event_processor.papers_dir / arxiv_id
    paper_dir.mkdir(parents=True)
    
    # Append events
    for event in events:
        event_processor.paper_manager.append_event(arxiv_id, event)
    
    # Verify events were written
    events_file = paper_dir / event_processor.paper_manager._event_log_fname
    lines = events_file.read_text().splitlines()
    
    events_data = [json.loads(line) for line in lines]
    assert len(events_data) == 3
    
    for i, event_data in enumerate(events_data):
        assert event_data["timestamp"] == f"2024-01-01T0{i}:00:00Z"
        assert event_data["duration_minutes"] == 30

def test_event_file_structure(event_processor, tmp_path):
    """Test structure and format of events log entries."""
    arxiv_id = "2401.00001"
    paper_dir = event_processor.papers_dir / arxiv_id
    paper_dir.mkdir(parents=True)
    
    event = ReadingSession(
        arxivId=arxiv_id,
        timestamp="2024-01-01T00:00:00Z",
        duration_minutes=30,
        issue_url="https://example.com/1"
    )
    
    event_processor.paper_manager.append_event(arxiv_id, event)
    
    # Verify event structure
    events_file = paper_dir / event_processor.paper_manager._event_log_fname
    event_data = json.loads(events_file.read_text())
    
    assert event_data["type"] == "reading_session"
    assert event_data["duration_minutes"] == 30
    assert event_data["arxiv_id"] == arxiv_id

def test_event_file_concurrent_access(event_processor, tmp_path):
    """Test handling concurrent event writes."""
    arxiv_id = "2401.00001"
    paper_dir = event_processor.papers_dir / arxiv_id
    paper_dir.mkdir(parents=True)
    
    # Create multiple events
    events = [
        ReadingSession(
            arxivId=arxiv_id,
            timestamp=f"2024-01-01T00:0{i}:00Z",
            duration_minutes=30,
            issue_url=f"https://example.com/{i}"
        ) for i in range(10)
    ]
    
    # Write events
    for event in events:
        event_processor.paper_manager.append_event(arxiv_id, event)
    
    # Verify all events were written
    events_file = paper_dir / event_processor.paper_manager._event_log_fname
    lines = events_file.read_text().splitlines()
    assert len(lines) == 10
    
    # Verify event integrity
    for line in lines:
        event_data = json.loads(line)
        assert event_data["type"] == "reading_session"
        assert event_data["duration_minutes"] == 30
