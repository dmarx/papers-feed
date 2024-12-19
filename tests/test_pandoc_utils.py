# tests/test_pandoc_utils.py
"""Tests for pandoc utilities and conversion process."""
import os
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch
import pytest
from scripts.pandoc_utils import PandocConverter, PandocConfig, create_default_config

@pytest.fixture
def mock_subprocess_run():
    """Mock successful subprocess run."""
    mock = Mock()
    mock.return_value.returncode = 0
    mock.return_value.stdout = "Success"
    mock.return_value.stderr = ""
    return mock

@pytest.fixture
def test_tex_content():
    """Sample LaTeX content for testing."""
    return r"""
\documentclass{article}
\begin{document}
\title{Test Document}
\maketitle
\section{Introduction}
Test content
\end{document}
"""

@pytest.fixture
def paper_dir(tmp_path):
    """Create a paper directory with necessary structure."""
    paper_dir = tmp_path / "papers/2203.15556"
    paper_dir.mkdir(parents=True)
    return paper_dir

@pytest.fixture
def source_dir(paper_dir):
    """Create source directory with test TeX file."""
    source_dir = paper_dir / "source"
    source_dir.mkdir()
    tex_file = source_dir / "main.tex"
    tex_file.write_text(test_tex_content)
    return source_dir

@pytest.fixture
def converter(paper_dir):
    """Create PandocConverter instance with test configuration."""
    config = create_default_config(paper_dir)
    return PandocConverter(config)

def test_directory_creation(paper_dir, converter):
    """Test that all necessary directories are created."""
    media_dir = paper_dir / "media"
    assert media_dir.exists(), "Media directory not created"
    assert media_dir.is_dir(), "Media path is not a directory"

def test_supporting_files_creation(paper_dir, converter):
    """Test that all supporting files are created correctly."""
    media_dir = paper_dir / "media"
    
    # Check Lua filter
    lua_filter = media_dir / "crossref.lua"
    assert lua_filter.exists(), "Lua filter not created"
    content = lua_filter.read_text()
    assert "function Math(elem)" in content, "Lua filter content incorrect"
    
    # Check metadata file
    metadata_file = media_dir / "metadata.yaml"
    assert metadata_file.exists(), "Metadata file not created"
    content = metadata_file.read_text()
    assert "reference-section-title" in content, "Metadata content incorrect"

def test_file_verification(paper_dir, converter):
    """Test file verification logic."""
    assert converter._verify_files_exist(), "File verification failed"

def test_pandoc_command_building(paper_dir, converter):
    """Test pandoc command construction."""
    input_file = Path("test.tex")
    output_file = Path("test.md")
    cmd = converter.build_pandoc_command(input_file, output_file)
    
    assert cmd[0] == "pandoc", "Command should start with pandoc"
    assert f"--extract-media={converter.config.extract_media_dir}" in " ".join(cmd), \
        "Media directory not properly configured"
    assert "--metadata-file" in cmd, "Metadata file not included in command"
    assert "--lua-filter" in cmd, "Lua filter not included in command"

@pytest.mark.integration
def test_full_conversion_process(paper_dir, source_dir, converter, mock_subprocess_run):
    """Test the complete conversion process."""
    with patch('subprocess.run', mock_subprocess_run):
        input_file = source_dir / "main.tex"
        output_file = paper_dir / "2203.15556.md"
        
        # Verify input exists
        assert input_file.exists(), "Test TeX file not created"
        
        # Run conversion
        success = converter.convert_tex_to_markdown(input_file, output_file)
        assert success, "Conversion failed"
        
        # Verify subprocess call
        mock_subprocess_run.assert_called_once()
        cmd = mock_subprocess_run.call_args[0][0]
        assert isinstance(cmd, list), "Command should be a list"
        assert cmd[0] == "pandoc", "Should call pandoc"

@pytest.mark.integration
def test_real_pandoc_execution(paper_dir, source_dir, converter):
    """Test with actual pandoc execution."""
    try:
        # Verify pandoc is installed
        result = subprocess.run(["pandoc", "--version"], 
                              capture_output=True, text=True)
        assert result.returncode == 0, "Pandoc not available"
        
        input_file = source_dir / "main.tex"
        output_file = paper_dir / "2203.15556.md"
        
        # Create minimal test file
        minimal_tex = r"""
\documentclass{article}
\begin{document}
Test
\end{document}
"""
        input_file.write_text(minimal_tex)
        
        # Run conversion
        success = converter.convert_tex_to_markdown(input_file, output_file)
        
        # Print debug info if conversion fails
        if not success:
            print("\nDebug information:")
            print(f"Input file exists: {input_file.exists()}")
            print(f"Input file content:\n{input_file.read_text()}")
            print(f"Media dir exists: {converter.config.extract_media_dir.exists()}")
            print(f"Metadata file exists: {converter.config.metadata_file.exists()}")
            if converter.config.metadata_file.exists():
                print(f"Metadata content:\n{converter.config.metadata_file.read_text()}")
            print(f"Lua filter exists: {converter.config.lua_filter.exists()}")
            if converter.config.lua_filter.exists():
                print(f"Lua filter content:\n{converter.config.lua_filter.read_text()}")
        
        assert success, "Real pandoc conversion failed"
        assert output_file.exists(), "Output file not created"
        assert output_file.stat().st_size > 0, "Output file is empty"
        
    except FileNotFoundError:
        pytest.skip("Pandoc not installed")

def test_error_handling(paper_dir, converter):
    """Test error handling in various scenarios."""
    
    # Test with non-existent input file
    success = converter.convert_tex_to_markdown(Path("nonexistent.tex"))
    assert not success, "Should fail with non-existent input"
    
    # Test with invalid media directory
    converter.config.extract_media_dir = Path("/nonexistent/path")
    success = converter.convert_tex_to_markdown(Path("test.tex"))
    assert not success, "Should fail with invalid media directory"

def test_temporary_directory_cleanup(paper_dir, source_dir, converter):
    """Test that temporary directory is properly cleaned up."""
    temp_dirs_before = set(Path(tempfile.gettempdir()).iterdir())
    
    with patch('subprocess.run') as mock_run:
        mock_run.return_value.returncode = 0
        converter.convert_tex_to_markdown(
            source_dir / "main.tex",
            paper_dir / "output.md"
        )
    
    temp_dirs_after = set(Path(tempfile.gettempdir()).iterdir())
    assert temp_dirs_before == temp_dirs_after, "Temporary directory not cleaned up"

if __name__ == "__main__":
    pytest.main(["-v", "-s", __file__])
