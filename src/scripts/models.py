from pydantic import BaseModel, Field
from datetime import datetime, timezone

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
    main_tex_file: str | None = None  # Path to main TeX file used for conversion
    
    published_date: str | None = None  # v1 publication date on arXiv
    arxiv_tags: list[str] | None = None 
    
    class Config:
        populate_by_name = True

class ReadingSession(BaseModel):
    """Schema for reading session events"""
    type: str = "reading_session"
    arxiv_id: str = Field(..., alias="arxivId") 
    timestamp: str = Field(..., description="Original timestamp when reading occurred")
    duration_seconds: int
    issue_url: str
    processed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PaperVisitEvent(BaseModel):
    """Schema for paper visit events"""
    type: str = "paper_visit" 
    timestamp: str = Field(..., description="Original timestamp when visit occurred")
    issue_url: str
    arxiv_id: str
