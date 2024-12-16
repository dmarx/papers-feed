# tests/test_download_papers.py
import pytest
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, patch
from scripts.download_papers import PDFDownloader

class AsyncContextManagerMock:
    def __init__(self, return_value):
        self.return_value = return_value
        
    async def __aenter__(self):
        return self.return_value
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

@pytest.fixture
def downloader(tmp_path):
    downloader = PDFDownloader()
    downloader.papers_dir = tmp_path / "papers"
    downloader.papers_dir.mkdir()
    return downloader

def test_get_papers_missing_pdfs(downloader):
    # Create paper directory without PDF
    arxiv_id = "2401.00001"
    paper_dir = downloader.papers_dir / arxiv_id
    paper_dir.mkdir()
    
    missing = downloader.get_papers_missing_pdfs()
    assert len(missing) == 1
    assert missing[0] == arxiv_id

def test_get_papers_missing_pdfs_with_pdf(downloader):
    # Create paper directory with PDF
    arxiv_id = "2401.00001"
    paper_dir = downloader.papers_dir / arxiv_id
    paper_dir.mkdir()
    
    # Create empty PDF file
    (paper_dir / f"{arxiv_id}.pdf").touch()
    
    missing = downloader.get_papers_missing_pdfs()
    assert len(missing) == 0

def test_get_pdf_url():
    downloader = PDFDownloader()
    arxiv_id = "2401.00001"
    assert downloader.get_pdf_url(arxiv_id) == f"https://arxiv.org/pdf/{arxiv_id}.pdf"

@pytest.mark.asyncio
async def test_download_pdf(downloader):
    # Mock successful PDF download
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read.return_value = b"fake pdf content"
    
    mock_session = AsyncMock()
    mock_session.get.return_value = AsyncContextManagerMock(mock_response)
    
    # Create paper directory
    arxiv_id = "2401.00001"
    paper_dir = downloader.papers_dir / arxiv_id
    paper_dir.mkdir()
    
    success = await downloader.download_pdf(mock_session, arxiv_id)
    assert success
    
    # Verify PDF was created
    pdf_path = paper_dir / f"{arxiv_id}.pdf"
    assert pdf_path.exists()
    assert pdf_path.read_bytes() == b"fake pdf content"

@pytest.mark.asyncio
async def test_download_pdf_failure(downloader):
    # Mock failed PDF download
    mock_response = AsyncMock()
    mock_response.status = 404
    
    mock_session = AsyncMock()
    mock_session.get.return_value = AsyncContextManagerMock(mock_response)
    
    # Create paper directory
    arxiv_id = "2401.00001"
    paper_dir = downloader.papers_dir / arxiv_id
    paper_dir.mkdir()
    
    success = await downloader.download_pdf(mock_session, arxiv_id)
    assert not success
    
    # Verify no PDF was created
    pdf_path = paper_dir / f"{arxiv_id}.pdf"
    assert not pdf_path.exists()

@pytest.mark.asyncio
async def test_download_all_missing(downloader):
    # Create paper directory
    arxiv_id = "2401.00001"
    paper_dir = downloader.papers_dir / arxiv_id
    paper_dir.mkdir()
    
    # Mock successful PDF download
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read.return_value = b"fake pdf content"
    
    mock_session = AsyncMock()
    mock_session.get.return_value = AsyncContextManagerMock(mock_response)
    
    # Need to mock ClientSession to return our mock session
    mock_client_session = AsyncMock()
    mock_client_session.__aenter__.return_value = mock_session
    mock_client_session.__aexit__.return_value = None
    
    with patch('aiohttp.ClientSession', return_value=mock_client_session):
        await downloader.download_all_missing()
    
    # Verify PDF was downloaded
    pdf_path = paper_dir / f"{arxiv_id}.pdf"
    assert pdf_path.exists()
    assert pdf_path.read_bytes() == b"fake pdf content"
