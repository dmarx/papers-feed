"""Tests for pandoc utilities and conversion process."""
import os
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch
import pytest
from scripts.pandoc_utils import PandocConverter, PandocConfig, create_default_config

# Register the integration mark to remove warnings
pytest.mark.integration = pytest.mark.integration

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

# @pytest.fixture
# def paper_dir(tmp_path):
#     """Create a paper directory with necessary structure."""
#     paper_dir = tmp_path / "papers/2203.15556"
#     paper_dir.mkdir(parents=True)
#     return paper_dir

@pytest.fixture
def source_dir(paper_dir, test_tex_content):  # Note: now properly using the fixture
    """Create source directory with test TeX file."""
    source_dir = paper_dir / "source"
    source_dir.mkdir()
    tex_file = source_dir / "main.tex"
    tex_file.write_text(test_tex_content)  # Using the fixture value
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
        
        # Mock should create the output file to simulate pandoc behavior
        def mock_pandoc_effect(*args, **kwargs):
            mock_result = Mock()
            mock_result.returncode = 0
            mock_result.stdout = "Success"
            mock_result.stderr = ""
            
            # Get output file path from command args
            output_path = args[0][args[0].index('-o') + 1]
            # Simulate pandoc creating the output file
            Path(output_path).write_text("# Test Output\nConverted content")
            return mock_result
        
        mock_subprocess_run.side_effect = mock_pandoc_effect
        
        # Run conversion
        try:
            converter.convert_tex_to_markdown(input_file, output_file)
        except Exception as e:
            pytest.fail(f"Conversion failed with error: {e}")

@pytest.mark.integration
def test_real_pandoc_execution(paper_dir, source_dir, converter, test_tex_content):
    """Test with actual pandoc execution."""
    try:
        # Verify pandoc is installed
        result = subprocess.run(["pandoc", "--version"], 
                              capture_output=True, text=True)
        assert result.returncode == 0, "Pandoc not available"
        
        input_file = source_dir / "main.tex"
        output_file = paper_dir / "2203.15556.md"
        
        # Write minimal test content
        input_file.write_text(test_tex_content)
        
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
    with pytest.raises(FileNotFoundError, match="LaTeX file not found"):
        converter.convert_tex_to_markdown(Path("nonexistent.tex"))

def test_temporary_directory_cleanup(paper_dir, source_dir, converter):
    """Test that temporary directory is properly cleaned up."""
    temp_dirs_before = set(Path(tempfile.gettempdir()).iterdir())
    
    with patch('subprocess.run') as mock_run:
        # Mock should create the output file
        def mock_success(*args, **kwargs):
            mock_result = Mock()
            mock_result.returncode = 0
            mock_result.stdout = "Success"
            mock_result.stderr = ""
            
            # Get output file path from command args
            output_path = args[0][args[0].index('-o') + 1]
            # Simulate pandoc creating the output file
            Path(output_path).write_text("Mock output")
            return mock_result
            
        mock_run.side_effect = mock_success
        
        try:
            converter.convert_tex_to_markdown(
                source_dir / "main.tex",
                paper_dir / "output.md"
            )
        except Exception as e:
            pytest.fail(f"Conversion failed with error: {e}")
    
    temp_dirs_after = set(Path(tempfile.gettempdir()).iterdir())
    assert temp_dirs_before == temp_dirs_after, "Temporary directory not cleaned up"

@pytest.mark.integration
def test_minimal_pandoc_conversion(tmp_path):
    """Test bare minimum pandoc conversion with real pandoc."""
    try:
        # Verify pandoc is installed
        result = subprocess.run(["pandoc", "--version"], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            pytest.skip("Pandoc not installed")
            
        # Create test directory structure
        paper_dir = tmp_path / "test_paper"
        paper_dir.mkdir()
        
        # Create test LaTeX file
        tex_file = paper_dir / "test.tex"
        tex_file.write_text(r"""
\documentclass{article}
\begin{document}
Test content
\end{document}
""")
        
        # Create output path
        output_file = paper_dir / "test.md"
        
        # Run minimal pandoc command
        cmd = [
            'pandoc',
            '-f', 'latex',
            '-t', 'gfm',
            '--standalone',
            str(tex_file.resolve()),
            '-o', str(output_file.resolve())
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(f"\nCommand: {' '.join(cmd)}")
        print(f"Return code: {result.returncode}")
        print(f"Stdout: {result.stdout}")
        print(f"Stderr: {result.stderr}")
        
        assert result.returncode == 0, f"Pandoc failed: {result.stderr}"
        assert output_file.exists(), "Output file not created"
        content = output_file.read_text()
        assert "Test content" in content, "Expected content not found"
        
    except FileNotFoundError:
        pytest.skip("Pandoc not installed")

if __name__ == "__main__":
    pytest.main(["-v", "-s", __file__])
