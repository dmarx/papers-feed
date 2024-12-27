# tests/test_tex_utils.py
"""Tests for TeX utilities."""

import pytest
from pathlib import Path
from scripts.tex_utils import find_main_tex_file, score_tex_file

@pytest.fixture
def tex_dir(tmp_path):
    """Create a temporary directory with test TeX files."""
    tex_dir = tmp_path / "tex"
    tex_dir.mkdir()
    return tex_dir

def create_tex_file(directory: Path, name: str, content: str) -> Path:
    """Helper to create a TeX file with given content."""
    file_path = directory / name
    file_path.write_text(content)
    return file_path

def test_score_tex_file(tex_dir):
    # Create test file with various indicators
    content = r"""
\documentclass{article}
\begin{document}
\title{Test Paper}
\author{Test Author}
\maketitle
\section{Introduction}
Test content
\end{document}
"""
    tex_file = create_tex_file(tex_dir, "main.tex", content)
    
    result = score_tex_file(tex_file)
    assert result.score > 0
    assert any("documentclass" in r for r in result.reasons)
    assert any("Main filename" in r for r in result.reasons)

def test_find_main_tex_file_simple(tex_dir):
    # Create main file
    main_content = r"""
\documentclass{article}
\begin{document}
\title{Main Paper}
\end{document}
"""
    main_file = create_tex_file(tex_dir, "main.tex", main_content)
    
    # Create supplementary file
    supp_content = r"""
\documentclass{article}
\begin{document}
\section{Appendix}
\end{document}
"""
    supp_file = create_tex_file(tex_dir, "supplement.tex", supp_content)
    
    result = find_main_tex_file([main_file, supp_file])
    assert result == main_file

def test_find_main_tex_file_ml_conference(tex_dir):
    # Create conference submission file
    conf_content = r"""
\documentclass{neurips_2024}
\begin{document}
\title{Deep Learning Paper}
\end{document}
"""
    conf_file = create_tex_file(tex_dir, "neurips_conference.tex", conf_content)
    
    result = find_main_tex_file([conf_file])
    assert result == conf_file

def test_find_main_tex_file_empty_list():
    assert find_main_tex_file([]) is None

def test_score_tex_file_with_inputs(tex_dir):
    # Test file with multiple inputs (should get penalty)
    content = r"""
\documentclass{article}
\begin{document}
\input{intro}
\input{methods}
\input{results}
\end{document}
"""
    tex_file = create_tex_file(tex_dir, "main.tex", content)
    
    result = score_tex_file(tex_file)
    assert any("Input/include commands" in r for r in result.reasons)
    assert any(r.startswith("Input/include commands (-") for r in result.reasons)
