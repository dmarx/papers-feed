# tests/conftest.py
import subprocess
import pytest
from unittest.mock import Mock, patch
from pathlib import Path

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

    try:
        # Get I/O files if specified
        input_idx = None
        output_idx = None
        for i, arg in enumerate(cmd):
            if arg.endswith('.tex'):
                input_idx = i
            if arg == '-o':
                output_idx = i
        
        if input_idx is not None and output_idx is not None:
            input_file = Path(cmd[input_idx])
            output_file = Path(cmd[output_idx + 1])
            
            # Handle non-main files
            if not input_file.name.startswith('main') and not input_file.name.startswith('neurips'):
                mock_result.returncode = 1
                mock_result.stderr = "Error: Not a main TeX file"
                return mock_result
            
            # Create mock output
            mock_content = "# Mock Pandoc Output\n\nConverted content\n"
            output_file.write_text(mock_content)
            
    except (ValueError, IndexError) as e:
        print(f"Error in mock_pandoc_run: {e}")  # Debug output
        pass
            
    return mock_result

@pytest.fixture
def mock_pandoc(monkeypatch):
    """Fixture to provide pandoc mock if not installed."""
    if not is_pandoc_installed():
        with patch('subprocess.run') as mock_run:
            mock_run.side_effect = mock_pandoc_run
            yield mock_run
    else:
        yield None
