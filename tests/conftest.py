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

def mock_pandoc_success(cmd, **kwargs):
    """Mock successful pandoc execution."""
    mock_result = Mock()
    mock_result.returncode = 0
    mock_result.stdout = "Success"
    mock_result.stderr = ""
    
    # If output file was specified, create it
    cmd_str = ' '.join(cmd)
    if '-o' in cmd_str:
        output_file = cmd[cmd.index('-o') + 1]
        with open(output_file, 'w') as f:
            f.write("# Mock Pandoc Output\n\nConverted content")
    
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
