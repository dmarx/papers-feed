# tests/conftest.py
import subprocess
import pytest
from unittest.mock import Mock, patch

def is_pandoc_installed():
    """Check if pandoc is available on the system."""
    try:
        result = subprocess.run(['pandoc', '--version'], 
                              capture_output=True, 
                              text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def mock_pandoc_run(cmd, capture_output=False, cwd=None, text=True):
    """Mock pandoc execution that can return errors or success."""
    mock_result = Mock()
    mock_result.returncode = 0
    mock_result.stdout = "Success"
    mock_result.stderr = ""

    # Check if this is a version check
    if '--version' in cmd:
        return mock_result

    # Get the output file if specified
    cmd_str = ' '.join(cmd)
    if '-o' in cmd:
        output_path = cmd[cmd.index('-o') + 1]
        
        # For tex file errors, check input file
        input_file = cmd[-3]  # Assuming input file is before -o output
        if 'appendix.tex' in input_file or 'supplement.tex' in input_file:
            mock_result.returncode = 1
            mock_result.stderr = "Error: No main file identified"
            return mock_result
            
        # Create successful output for main.tex
        with open(output_path, 'w') as f:
            f.write("# Mock Pandoc Output\n\nConverted content")
            
    return mock_result
    
    return mock_result

@pytest.fixture
def mock_pandoc():
    """Fixture to provide pandoc mock if not installed."""
    if not is_pandoc_installed():
        with patch('subprocess.run') as mock_run:
            mock_run.side_effect = mock_pandoc_success
            yield mock_run
    else:
        yield None
