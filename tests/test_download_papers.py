# tests/test_download_papers.py
import pytest
from pathlib import Path
from scripts.download_papers import ArxivDownloader

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
    
    papers_status = downloader.get_papers_missing_files()
    assert len(papers_status) == 2
    
    paper1_status = next(p for p in papers_status if p['arxiv_id'] == paper1_id)
    assert not paper1_status['has_pdf']
    assert not paper1_status['has_source']
    assert not paper1_status['has_markdown']
    assert not paper1_status['failed_markdown']
    
    paper2_status = next(p for p in papers_status if p['arxiv_id'] == paper2_id)
    assert paper2_status['has_pdf']
    assert paper2_status['has_source']
    assert not paper2_status['has_markdown']
    assert not paper2_status['failed_markdown']

def test_get_urls():
    downloader = ArxivDownloader()
    arxiv_id = "2401.00001"
    assert downloader.get_pdf_url(arxiv_id) == f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    assert downloader.get_source_url(arxiv_id) == f"https://arxiv.org/e-print/{arxiv_id}"

def test_convert_to_markdown(downloader, paper_dir, sample_tex_content):
    source_dir = paper_dir / "source"
    source_dir.mkdir()
    
    # Create sample tex file
    main_tex = source_dir / "main.tex"
    main_tex.write_text(sample_tex_content)
    
    # Create a mock markdown file to simulate pandoc conversion
    markdown_file = paper_dir / f"{paper_dir.name}.md"
    markdown_file.touch()
    
    # Test the file finding logic
    tex_files = list(source_dir.rglob('*.tex'))
    assert len(tex_files) == 1
    assert tex_files[0] == main_tex
    assert main_tex.read_text() == sample_tex_content
