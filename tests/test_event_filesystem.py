# tests/test_event_filesystem.py
import json
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, AsyncMock
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

@pytest.mark.asyncio
async def test_event_file_creation(event_processor):
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
    
    # Append event should create directory and file
    await event_processor.paper_manager.append_event(arxiv_id, event)
    
    # Verify directory and file were created
    assert paper_dir.exists()
    assert paper_dir.is_dir()
    
    events_file = paper_dir / "events.log"
    assert events_file.exists()
    assert events_file.is_file()
    
    # Verify file content
    content = events_file.read_text()
    # First line should be paper registration event
    lines = content.splitlines()
    assert len(lines) >= 2  # Should have registration event + reading event
    
    reading_event = json.loads(lines[-1])  # Last event should be reading event
    assert reading_event["arxiv_id"] == arxiv_id
    assert reading_event["duration_minutes"] == 30

@pytest.mark.asyncio
async def test_multiple_event_appending(event_processor):
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
    
    # Append multiple events
    for event in events:
        await event_processor.paper_manager.append_event(arxiv_id, event)
    
    # Verify file contents
    events_file = event_processor.papers_dir / arxiv_id / "events.log"
    lines = events_file.read_text().splitlines()
    
    # Should have registration event + reading events
    assert len(lines) == 4  # 1 registration + 3 reading events
    
    # Parse and verify events
    events_data = [json.loads(line) for line in lines]
    assert events_data[0]["type"] == "paper_registered"
    
    reading_events = events_data[1:]  # Skip registration event
    for i, event_data in enumerate(reading_events):
        assert event_data["timestamp"] == f"2024-01-01T0{i}:00:00Z"
        assert event_data["duration_minutes"] == 30

@pytest.mark.asyncio
async def test_event_file_structure(event_processor):
    """Test structure and format of events log entries."""
    arxiv_id = "2401.00001"
    
    # Test both types of events
    reading_event = ReadingSession(
        arxivId=arxiv_id,
        timestamp="2024-01-01T00:00:00Z",
        duration_minutes=30,
        issue_url="https://example.com/1"
    )
    
    registration_event = PaperRegistrationEvent(
        timestamp="2024-01-01T00:00:00Z",
        issue_url="https://example.com/2",
        arxiv_id=arxiv_id
    )
    
    await event_processor.paper_manager.append_event(arxiv_id, reading_event)
    # Note: We don't need to explicitly append the registration event as it's created automatically
    
    # Verify file contents and structure
    events_file = event_processor.papers_dir / arxiv_id / "events.log"
    lines = events_file.read_text().splitlines()
    
    # Parse and verify events
    events_data = [json.loads(line) for line in lines]
    
    # First event should be registration
    assert events_data[0]["type"] == "paper_registered"
    assert events_data[0]["arxiv_id"] == arxiv_id
    
    # Second event should be reading session
    assert events_data[1]["type"] == "reading_session"
    assert events_data[1]["duration_minutes"] == 30
    assert events_data[1]["arxiv_id"] == arxiv_id

@pytest.mark.asyncio
async def test_event_file_concurrent_access(event_processor):
    """Test concurrent access to events log file."""
    arxiv_id = "2401.00001"
    events = [
        ReadingSession(
            arxivId=arxiv_id,
            timestamp=f"2024-01-01T00:00:0{i}Z",
            duration_minutes=30,
            issue_url=f"https://example.com/{i}"
        ) for i in range(10)
    ]
    
    # Simulate concurrent writes
    await asyncio.gather(*(
        event_processor.paper_manager.append_event(arxiv_id, event)
        for event in events
    ))
    
    # Verify all events were written
    events_file = event_processor.papers_dir / arxiv_id / "events.log"
    lines = events_file.read_text().splitlines()
    assert len(lines) == 11  # 1 registration + 10 reading events
    
    # Verify no corrupted/partial writes
    for line in lines:
        try:
            event_data = json.loads(line)
            if event_data["type"] == "reading_session":
                assert event_data["duration_minutes"] == 30
                assert event_data["arxiv_id"] == arxiv_id
        except json.JSONDecodeError:
            pytest.fail("Found corrupted JSON line in events log")
