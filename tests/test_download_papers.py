# tests/test_download_papers.py
import pytest
import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from scripts.download_papers import PDFDownloader

@pytest.fixture
def sample_paper_metadata():
    return {
        "arxivId": "2401.00001",
        "title": "Test Paper",
        "url": "https://arxiv.org/abs/2401.00001",
        "authors": "Test Author",
        "abstract": "Test abstract"
    }

@pytest.fixture
def downloader(tmp_path):
    downloader = PDFDownloader()
    downloader.papers_dir = tmp_path / "papers"
    downloader.papers_dir.mkdir()
    return downloader

def test_get_papers_missing_pdfs(downloader, sample_paper_metadata):
    # Create paper directory with metadata but no PDF
    paper_dir = downloader.papers_dir / sample_paper_metadata["arxivId"]
    paper_dir.mkdir()
    with (paper_dir / "metadata.json").open('w') as f:
        json.dump(sample_paper_metadata, f)
    
    missing = downloader.get_papers_missing_pdfs()
    assert len(missing) == 1
    assert missing[0]["arxivId"] == sample_paper_metadata["arxivId"]

def test_get_papers_missing_pdfs_with_pdf(downloader, sample_paper_metadata):
    # Create paper directory with both metadata and PDF
    paper_dir = downloader.papers_dir / sample_paper_metadata["arxivId"]
    paper_dir.mkdir()
    with (paper_dir / "metadata.json").open('w') as f:
        json.dump(sample_paper_metadata, f)
    
    # Create empty PDF file
    (paper_dir / f"{sample_paper_metadata['arxivId']}.pdf").touch()
    
    missing = downloader.get_papers_missing_pdfs()
    assert len(missing) == 0

def test_get_pdf_url():
    downloader = PDFDownloader()
    
    # Test different URL formats
    assert downloader.get_pdf_url("https://arxiv.org/abs/2401.00001") == "https://arxiv.org/pdf/2401.00001.pdf"
    assert downloader.get_pdf_url("https://arxiv.org/pdf/2401.00001.pdf") == "https://arxiv.org/pdf/2401.00001.pdf"
    assert downloader.get_pdf_url("https://arxiv.org/2401.00001") == "https://arxiv.org/pdf/2401.00001.pdf"
    
    # Test invalid URL
    assert downloader.get_pdf_url("invalid-url") is None

@pytest.mark.asyncio
async def test_download_pdf(downloader, sample_paper_metadata):
    # Mock successful PDF download
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read = AsyncMock(return_value=b"fake pdf content")
    
    mock_session = AsyncMock()
    mock_session.get = AsyncMock(return_value=mock_response)
    
    # Create paper directory
    paper_dir = downloader.papers_dir / sample_paper_metadata["arxivId"]
    paper_dir.mkdir()
    
    success = await downloader.download_pdf(mock_session, sample_paper_metadata)
    assert success
    
    # Verify PDF was created
    pdf_path = paper_dir / f"{sample_paper_metadata['arxivId']}.pdf"
    assert pdf_path.exists()
    assert pdf_path.read_bytes() == b"fake pdf content"

@pytest.mark.asyncio
async def test_download_pdf_failure(downloader, sample_paper_metadata):
    # Mock failed PDF download
    mock_response = AsyncMock()
    mock_response.status = 404
    
    mock_session = AsyncMock()
    mock_session.get = AsyncMock(return_value=mock_response)
    
    # Create paper directory
    paper_dir = downloader.papers_dir / sample_paper_metadata["arxivId"]
    paper_dir.mkdir()
    
    success = await downloader.download_pdf(mock_session, sample_paper_metadata)
    assert not success
    
    # Verify no PDF was created
    pdf_path = paper_dir / f"{sample_paper_metadata['arxivId']}.pdf"
    assert not pdf_path.exists()

@pytest.mark.asyncio
async def test_download_all_missing(downloader, sample_paper_metadata):
    # Create paper directory with metadata
    paper_dir = downloader.papers_dir / sample_paper_metadata["arxivId"]
    paper_dir.mkdir()
    with (paper_dir / "metadata.json").open('w') as f:
        json.dump(sample_paper_metadata, f)
    
    # Mock successful PDF download
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read = AsyncMock(return_value=b"fake pdf content")
    
    mock_session = AsyncMock()
    mock_session.get = AsyncMock(return_value=mock_response)
    
    with patch('aiohttp.ClientSession', return_value=mock_session):
        await downloader.download_all_missing()
    
    # Verify PDF was downloaded
    pdf_path = paper_dir / f"{sample_paper_metadata['arxivId']}.pdf"
    assert pdf_path.exists()
    assert pdf_path.read_bytes() == b"fake pdf content"
