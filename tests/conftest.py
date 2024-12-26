# tests/conftest.py
import pytest
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

from scripts.paper_manager import PaperManager
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
    return tmp_path / "test_data"

@pytest.fixture
def paper_dir(test_dir):
    """Create a test paper directory."""
    paper_dir = test_dir / "2401.00001"
    paper_dir.mkdir(parents=True)
    return paper_dir


@pytest.fixture
def source_dir(test_dir):
    """Create source directory with test TeX content."""
    paper_dir = test_dir / "2401.00001"
    if paper_dir.exists():
        shutil.rmtree(paper_dir)
    paper_dir.mkdir(parents=True)
    
    source_dir = paper_dir / "source"
    source_dir.mkdir(parents=True)
    
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
