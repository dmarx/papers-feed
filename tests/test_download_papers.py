# tests/test_download_papers.py
import pytest
import asyncio
import tarfile
import tempfile
import io
from pathlib import Path
from unittest.mock import AsyncMock, patch, Mock, mock_open
from scripts.download_papers import ArxivDownloader

class AsyncContextManagerMock:
    def __init__(self, return_value):
        self.return_value = return_value
        
    async def __aenter__(self):
        return self.return_value
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

@pytest.fixture
def downloader(tmp_path):
    downloader = ArxivDownloader()
    downloader.papers_dir = tmp_path / "papers"
    downloader.papers_dir.mkdir()
    return downloader

@pytest.fixture
def paper_dir(downloader):
    """Create a paper directory for testing."""
    arxiv_id = "2401.00001"
    paper_dir = downloader.papers_dir / arxiv_id
    paper_dir.mkdir()
    return paper_dir

@pytest.fixture
def sample_tex_content():
    return r"""
\documentclass{article}
\title{Sample Paper}
\author{Test Author}
\begin{document}
\maketitle
\section{Introduction}
Sample text
\end{document}
"""

def test_get_papers_missing_files(downloader):
    # Create paper directory with different combinations of files
    paper1_id = "2401.00001"
    paper1_dir = downloader.papers_dir / paper1_id
    paper1_dir.mkdir()
    
    paper2_id = "2401.00002"
    paper2_dir = downloader.papers_dir / paper2_id
    paper2_dir.mkdir()
    (paper2_dir / f"{paper2_id}.pdf").touch()
    (paper2_dir / "source").mkdir()
    
    missing = downloader.get_papers_missing_files()
    assert len(missing) == 2
    
    paper1_missing = next(p for p in missing if p['arxiv_id'] == paper1_id)
    assert paper1_missing['needs_pdf']
    assert paper1_missing['needs_source']
    assert paper1_missing['needs_markdown']
    
    paper2_missing = next(p for p in missing if p['arxiv_id'] == paper2_id)
    assert not paper2_missing['needs_pdf']
    assert not paper2_missing['needs_source']
    assert paper2_missing['needs_markdown']

def test_get_urls():
    downloader = ArxivDownloader()
    arxiv_id = "2401.00001"
    assert downloader.get_pdf_url(arxiv_id) == f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    assert downloader.get_source_url(arxiv_id) == f"https://arxiv.org/e-print/{arxiv_id}"

@pytest.mark.asyncio
async def test_download_pdf(downloader, paper_dir):
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read.return_value = b"fake pdf content"
    
    mock_session = AsyncMock()
    mock_session.get.return_value = AsyncContextManagerMock(mock_response)
    
    arxiv_id = paper_dir.name
    success = await downloader.download_pdf(mock_session, arxiv_id)
    assert success
    
    pdf_path = paper_dir / f"{arxiv_id}.pdf"
    assert pdf_path.exists()
    assert pdf_path.read_bytes() == b"fake pdf content"

@pytest.mark.asyncio
async def test_download_source_tar(downloader, paper_dir, sample_tex_content):
    # Create a temporary tar file with a tex file
    tar_bytes = io.BytesIO()
    with tarfile.open(fileobj=tar_bytes, mode='w') as tar:
        data = sample_tex_content.encode('utf-8')
        info = tarfile.TarInfo('main.tex')
        info.size = len(data)
        tar.addfile(info, io.BytesIO(data))
    
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read.return_value = tar_bytes.getvalue()
    
    mock_session = AsyncMock()
    mock_session.get.return_value = AsyncContextManagerMock(mock_response)
    
    success = await downloader.download_source(mock_session, paper_dir.name)
    assert success
    
    source_dir = paper_dir / "source"
    assert source_dir.exists()
    assert (source_dir / "main.tex").exists()
    assert (source_dir / "main.tex").read_text() == sample_tex_content

@pytest.mark.asyncio
async def test_download_source_single_file(downloader, paper_dir, sample_tex_content):
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read.return_value = sample_tex_content.encode('utf-8')
    
    mock_session = AsyncMock()
    mock_session.get.return_value = AsyncContextManagerMock(mock_response)
    
    success = await downloader.download_source(mock_session, paper_dir.name)
    assert success
    
    source_dir = paper_dir / "source"
    main_tex = source_dir / "main.tex"
    assert source_dir.exists()
    assert main_tex.exists()
    assert main_tex.read_text() == sample_tex_content

def test_convert_to_markdown(downloader, sample_tex_content):
    arxiv_id = "2401.00001"
    paper_dir = downloader.papers_dir / arxiv_id
    source_dir = paper_dir / "source"
    source_dir.mkdir(parents=True)
    
    # Create sample tex file
    main_tex = source_dir / "main.tex"
    main_tex.write_text(sample_tex_content)
    
    # Mock pandoc subprocess call
    mock_result = Mock()
    mock_result.returncode = 0
    mock_result.stderr = ""
    
    with patch('subprocess.run', return_value=mock_result) as mock_run:
        success = downloader.convert_to_markdown(arxiv_id)
        assert success
        
        # Verify pandoc was called with correct arguments
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert args[0] == 'pandoc'
        assert args[1:3] == ['-f', 'latex']
        assert args[3:5] == ['-t', 'markdown']
        assert str(main_tex) in args
        assert str(paper_dir / f"{arxiv_id}.md") in args

@pytest.mark.asyncio
async def test_process_paper(downloader):
    arxiv_id = "2401.00001"
    paper_info = {
        'arxiv_id': arxiv_id,
        'needs_pdf': True,
        'needs_source': True,
        'needs_markdown': True
    }
    
    # Mock successful PDF download
    mock_pdf_response = AsyncMock()
    mock_pdf_response.status = 200
    mock_pdf_response.read.return_value = b"fake pdf content"
    
    # Mock successful source download
    mock_source_response = AsyncMock()
    mock_source_response.status = 200
    mock_source_response.read.return_value = b"fake tex content"
    
    mock_session = AsyncMock()
    mock_session.get = AsyncMock(side_effect=[
        AsyncContextManagerMock(mock_pdf_response),
        AsyncContextManagerMock(mock_source_response)
    ])
    
    # Mock pandoc conversion
    mock_result = Mock()
    mock_result.returncode = 0
    mock_result.stderr = ""
    
    with patch('subprocess.run', return_value=mock_result):
        success = await downloader.process_paper(mock_session, paper_info)
        assert success
        
        # Verify files were created
        paper_dir = downloader.papers_dir / arxiv_id
        assert (paper_dir / f"{arxiv_id}.pdf").exists()
        assert (paper_dir / "source").exists()
        assert (paper_dir / f"{arxiv_id}.md").exists()

@pytest.mark.asyncio
async def test_download_all_missing(downloader):
    # Create paper directory
    arxiv_id = "2401.00001"
    paper_dir = downloader.papers_dir / arxiv_id
    paper_dir.mkdir()
    
    # Mock successful responses
    mock_pdf_response = AsyncMock()
    mock_pdf_response.status = 200
    mock_pdf_response.read.return_value = b"fake pdf content"
    
    mock_source_response = AsyncMock()
    mock_source_response.status = 200
    mock_source_response.read.return_value = b"fake tex content"
    
    mock_session = AsyncMock()
    mock_session.get = AsyncMock(side_effect=[
        AsyncContextManagerMock(mock_pdf_response),
        AsyncContextManagerMock(mock_source_response)
    ])
    
    # Mock ClientSession context manager
    mock_client_session = AsyncMock()
    mock_client_session.__aenter__.return_value = mock_session
    mock_client_session.__aexit__.return_value = None
    
    # Mock pandoc conversion
    mock_result = Mock()
    mock_result.returncode = 0
    mock_result.stderr = ""
    
    with patch('aiohttp.ClientSession', return_value=mock_client_session):
        with patch('subprocess.run', return_value=mock_result):
            await downloader.download_all_missing()
    
    # Verify files were created
    assert (paper_dir / f"{arxiv_id}.pdf").exists()
    assert (paper_dir / "source").exists()
    assert (paper_dir / f"{arxiv_id}.md").exists()
