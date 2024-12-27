# tests/conftest.py
from datetime import datetime
import pytest
from pathlib import Path
from unittest.mock import Mock, patch
from scripts.models import Paper


@pytest.fixture
def mock_pandoc():
    """Mock pandoc for all tests."""
    def mock_pandoc_run(cmd, capture_output=False, cwd=None, text=True):
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "Success"
        mock_result.stderr = ""
        
        # Handle output file creation
        try:
            output_idx = cmd.index('-o')
            if output_idx + 1 < len(cmd):
                output_file = Path(cmd[output_idx + 1])
                output_file.write_text("# Mock Pandoc Output\n\nConverted content\n")
        except (ValueError, IndexError):
            pass
            
        return mock_result

    with patch('subprocess.run', side_effect=mock_pandoc_run):
        yield

@pytest.fixture
def test_dir(tmp_path):
    """Create a clean test directory."""
    return tmp_path / "papers"

@pytest.fixture
def paper_dir(test_dir):
    """Create a test paper directory."""
    paper_dir = test_dir / "2401.00001"
    paper_dir.mkdir(parents=True)
    return paper_dir

@pytest.fixture
def sample_paper():
    """Create sample Paper object."""
    return Paper(
        arxivId="2401.00001",
        title="Test Paper",
        authors="Test Author",
        abstract="Test Abstract",
        url="https://arxiv.org/abs/2401.00001",
        issue_number=1,
        issue_url="https://github.com/user/repo/issues/1",
        created_at=datetime.utcnow().isoformat(),
        state="open",
        labels=["paper"],
        total_reading_time_seconds=0,
        last_read=None
    )

@pytest.fixture
def source_dir(paper_dir):
    """Create source directory with test TeX content."""
    source_dir = paper_dir / "source"
    source_dir.mkdir()
    
    main_tex = source_dir / "main.tex"
    main_tex.write_text(r"""
\documentclass{article}
\begin{document}
\title{Test Document}
\maketitle
\section{Introduction}
Test content
\end{document}
""")
    
    return source_dir
