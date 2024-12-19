# src/scripts/pandoc_utils.py
"""Utilities for converting LaTeX papers to Markdown using Pandoc."""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
from loguru import logger
from dataclasses import dataclass

@dataclass
class PandocConfig:
    """Configuration for Pandoc conversion."""
    extract_media_dir: Path
    metadata_file: Optional[Path] = None
    css_file: Optional[Path] = None
    bib_file: Optional[Path] = None
    lua_filter: Optional[Path] = None

class PandocConverter:
    """Convert LaTeX papers to Markdown using enhanced Pandoc settings."""
    
    def __init__(self, config: PandocConfig):
        """Initialize converter with configuration."""
        self.config = config
        self._ensure_directories()
        self._create_default_files()
    
    def _ensure_directories(self):
        """Ensure all required directories exist."""
        # Create main media directory
        self.config.extract_media_dir.mkdir(parents=True, exist_ok=True)
        
        # Create parent directories for all configured paths
        paths_to_check = [
            self.config.metadata_file,
            self.config.css_file,
            self.config.bib_file,
            self.config.lua_filter
        ]
        
        for path in paths_to_check:
            if path is not None:
                path.parent.mkdir(parents=True, exist_ok=True)
    
    def _create_default_files(self):
        """Create default supporting files if not provided."""
        # Create and assign paths relative to media directory if not provided
        if not self.config.lua_filter:
            self.config.lua_filter = self.config.extract_media_dir / 'crossref.lua'
        
        if not self.config.metadata_file:
            self.config.metadata_file = self.config.extract_media_dir / 'metadata.yaml'
        
        # Ensure parent directories exist again (in case paths were just assigned)
        self._ensure_directories()
        
        # Create Lua filter
        lua_content = '''
function Math(elem)
    -- Preserve math content
    return elem
end

function Link(elem)
    -- Handle cross-references
    return elem
end

function Image(elem)
    -- Handle figure references
    return elem
end

function Table(elem)
    -- Handle table formatting
    return elem
end
'''
        self.config.lua_filter.write_text(lua_content)
        
        # Create metadata file
        metadata_content = '''---
reference-section-title: "References"
link-citations: true
citation-style: ieee
header-includes:
  - \\usepackage{amsmath}
  - \\usepackage{amsthm}
---'''
        self.config.metadata_file.write_text(metadata_content)
        
        logger.debug(f"Created supporting files in {self.config.extract_media_dir}")
    
    def build_pandoc_command(self, input_file: Path, output_file: Path) -> list[str]:
        """Build Pandoc command with all necessary arguments."""
        cmd = [
            'pandoc',
            # Input/output formats
            '-f', 'latex+raw_tex',  # Enable raw_tex extension
            '-t', 'gfm',
            
            # Math handling
            '--mathjax',
            
            # Table and formatting
            '--columns=1000',
            '--wrap=none',
            '--atx-headers',
            
            # Figure handling
            f'--extract-media={self.config.extract_media_dir}',
            '--standalone',
            
            # Debug info
            '--verbose',
        ]
        
        # Add optional components if configured
        if self.config.metadata_file and self.config.metadata_file.exists():
            cmd.extend(['--metadata-file', str(self.config.metadata_file)])
        
        if self.config.css_file and self.config.css_file.exists():
            cmd.extend(['--css', str(self.config.css_file)])
            
        if self.config.bib_file and self.config.bib_file.exists():
            cmd.extend([
                '--citeproc',
                '--bibliography', str(self.config.bib_file)
            ])
            
        if self.config.lua_filter and self.config.lua_filter.exists():
            cmd.extend(['--lua-filter', str(self.config.lua_filter)])
            
        # Add input/output files
        cmd.extend([
            str(input_file),
            '-o', str(output_file)
        ])
        
        return cmd
    
    def convert_tex_to_markdown(self, tex_file: Path, output_file: Optional[Path] = None) -> bool:
        """
        Convert a LaTeX file to Markdown using enhanced Pandoc settings.
        
        Args:
            tex_file: Path to LaTeX file
            output_file: Optional output path, defaults to same name with .md extension
            
        Returns:
            bool: True if conversion successful
        """
        try:
            if not tex_file.exists():
                logger.error(f"LaTeX file not found: {tex_file}")
                return False
                
            if not output_file:
                output_file = tex_file.with_suffix('.md')
                
            # Create temporary directory for conversion
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_dir = Path(temp_dir)
                
                # Copy LaTeX file to temp directory
                temp_tex = temp_dir / tex_file.name
                shutil.copy2(tex_file, temp_tex)
                
                # Build and run Pandoc command
                cmd = self.build_pandoc_command(temp_tex, output_file)
                logger.debug(f"Running Pandoc command: {' '.join(cmd)}")
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    cwd=str(temp_dir)
                )
                
                if result.returncode != 0:
                    logger.error(f"Pandoc conversion failed: {result.stderr}")
                    return False
                    
                logger.success(f"Successfully converted {tex_file} to {output_file}")
                return True
                
        except Exception as e:
            logger.error(f"Error converting {tex_file} to Markdown: {e}")
            return False

def create_default_config(paper_dir: Path) -> PandocConfig:
    """Create default Pandoc configuration for a paper directory."""
    media_dir = paper_dir / "media"
    return PandocConfig(extract_media_dir=media_dir)
