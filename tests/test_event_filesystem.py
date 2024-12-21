# tests/test_event_filesystem.py - New file focused on event persistence
import json
import pytest
from pathlib import Path
from scripts.process_events import EventProcessor
from scripts.models import ReadingSession, PaperRegistrationEvent

@pytest.fixture
def event_processor(tmp_path):
    """Fixture for EventProcessor with temporary directory"""
    with patch.dict('os.environ', {
        'GITHUB_TOKEN': 'fake_token',
        'GITHUB_REPOSITORY': 'user/repo'
    }):
        processor = EventProcessor()
        processor.papers_dir = tmp_path / "papers"
        processor.papers_dir.mkdir(parents=True)
        return processor

def test_event_file_creation(event_processor):
    """Test creation of events.log file"""
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
    event_processor.append_event(arxiv_id, event)
    
    events_file = paper_dir / "events.log"
    assert events_file.exists()
    assert events_file.is_file()

def test_multiple_event_appending(event_processor):
    """Test appending multiple events to log file"""
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
        event_processor.append_event(arxiv_id, event)
    
    # Verify file contents
    events_file = event_processor.papers_dir / arxiv_id / "events.log"
    lines = events_file.read_text().splitlines()
    
    assert len(lines) == 3
    
    # Verify each event was properly serialized
    for i, line in enumerate(lines):
        event_data = json.loads(line)
        assert event_data["timestamp"] == f"2024-01-01T0{i}:00:00Z"
        assert event_data["duration_minutes"] == 30

def test_event_file_structure(event_processor):
    """Test structure and format of events log entries"""
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
    
    event_processor.append_event(arxiv_id, reading_event)
    event_processor.append_event(arxiv_id, registration_event)
    
    # Verify file contents and structure
    events_file = event_processor.papers_dir / arxiv_id / "events.log"
    lines = events_file.read_text().splitlines()
    
    # Parse and verify each event
    events_data = [json.loads(line) for line in lines]
    
    # Verify reading session event
    assert events_data[0]["type"] == "reading_session"
    assert events_data[0]["duration_minutes"] == 30
    
    # Verify paper registration event
    assert events_data[1]["type"] == "paper_registered"
    assert events_data[1]["arxiv_id"] == arxiv_id

def test_event_file_concurrent_access(event_processor):
    """Test concurrent access to events log file"""
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
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(
            lambda e: event_processor.append_event(arxiv_id, e),
            events
        ))
    
    # Verify all events were written
    events_file = event_processor.papers_dir / arxiv_id / "events.log"
    lines = events_file.read_text().splitlines()
    assert len(lines) == 10
    
    # Verify no corrupted/partial writes
    for line in lines:
        try:
            json.loads(line)
        except json.JSONDecodeError:
            pytest.fail("Found corrupted JSON line in events log")
