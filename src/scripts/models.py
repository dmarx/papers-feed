from pydantic import BaseModel, Field
import datetime

class Paper(BaseModel):
    """Schema for paper metadata"""
    arxiv_id: str = Field(..., alias="arxivId")
    title: str
    authors: str
    abstract: str
    url: str
    issue_number: int
    issue_url: str
    created_at: str
    state: str
    labels: list[str]
    total_reading_time_seconds: int = 0
    last_read: str | None = None
    last_visited: str | None = None

    class Config:
        populate_by_name = True

class ReadingSession(BaseModel):
    """Schema for reading session events"""
    type: str = "reading_session"
    arxiv_id: str = Field(..., alias="arxivId") 
    timestamp: str = Field(..., description="Original timestamp when reading occurred")
    duration_seconds: int
    issue_url: str
    processed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class PaperRegistrationEvent(BaseModel):
    """Schema for paper registration events"""
    type: str = "paper_registered"
    timestamp: str
    issue_url: str
    arxiv_id: str
