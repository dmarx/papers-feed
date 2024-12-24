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
        try:
            self.config.extract_media_dir.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Created media directory: {self.config.extract_media_dir}")
            
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
                    logger.debug(f"Created directory for: {path}")
                    
        except Exception as e:
            logger.error(f"Error creating directories: {e}")
            raise
    
    def _write_file(self, path: Path, content: str) -> bool:
        """Write content to file and verify it exists."""
        try:
            path.write_text(content)
            # Verify file was written
            if not path.exists():
                logger.error(f"Failed to create file: {path}")
                return False
            logger.debug(f"Successfully wrote file: {path}")
            return True
        except Exception as e:
            logger.error(f"Error writing file {path}: {e}")
            return False
    
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
        if not self._write_file(self.config.lua_filter, lua_content):
            raise RuntimeError(f"Failed to create Lua filter: {self.config.lua_filter}")
        
        # Create metadata file
        metadata_content = '''---
reference-section-title: "References"
link-citations: true
citation-style: ieee
header-includes:
  - \\usepackage{amsmath}
  - \\usepackage{amsthm}
---'''
        if not self._write_file(self.config.metadata_file, metadata_content):
            raise RuntimeError(f"Failed to create metadata file: {self.config.metadata_file}")
        
        logger.debug("Successfully created all supporting files")
    
    def _verify_files_exist(self) -> bool:
        """Verify that all required files exist before running pandoc."""
        files_to_check = []
        
        if self.config.metadata_file:
            files_to_check.append(self.config.metadata_file)
        if self.config.lua_filter:
            files_to_check.append(self.config.lua_filter)
        if self.config.css_file:
            files_to_check.append(self.config.css_file)
        if self.config.bib_file:
            files_to_check.append(self.config.bib_file)
            
        for file_path in files_to_check:
            if not file_path.exists():
                logger.error(f"Required file does not exist: {file_path}")
                return False
            logger.debug(f"Verified file exists: {file_path}")
        
        return True
        
    def build_pandoc_command(self, input_file: Path, output_file: Path) -> list[str]:
        """Build Pandoc command with all necessary arguments."""
        cmd = [
            'pandoc',
            # Input/output formats
            '-f', 'latex+raw_tex',
            '-t', 'gfm',
            
            # Math handling
            '--mathjax',
            
            # Table and formatting
            '--columns=1000',
            '--wrap=none',
            
            # Figure handling
            f'--extract-media={self.config.extract_media_dir.resolve()}',
            '--standalone',
            
            # Debug info
            '--verbose',
        ]
        
        # Add optional components with absolute paths
        if self.config.metadata_file and self.config.metadata_file.exists():
            cmd.extend(['--metadata-file', str(self.config.metadata_file.resolve())])
            logger.debug(f"Adding metadata file: {self.config.metadata_file.resolve()}")
        
        if self.config.css_file and self.config.css_file.exists():
            cmd.extend(['--css', str(self.config.css_file.resolve())])
            logger.debug(f"Adding CSS file: {self.config.css_file.resolve()}")
            
        if self.config.bib_file and self.config.bib_file.exists():
            cmd.extend([
                '--citeproc',
                '--bibliography', str(self.config.bib_file.resolve())
            ])
            logger.debug(f"Adding bibliography file: {self.config.bib_file.resolve()}")
            
        if self.config.lua_filter and self.config.lua_filter.exists():
            cmd.extend(['--lua-filter', str(self.config.lua_filter.resolve())])
            logger.debug(f"Adding Lua filter: {self.config.lua_filter.resolve()}")
            
        # Add input/output files with absolute paths
        cmd.extend([
            str(input_file.resolve()),
            '-o', str(output_file.resolve())
        ])
        
        return cmd
        
    def convert_tex_to_markdown(self, tex_file: Path, output_file: Optional[Path] = None) -> bool:
        """
        Convert a LaTeX file to Markdown using Pandoc.
        
        Args:
            tex_file: Path to LaTeX file
            output_file: Optional output path, defaults to same name with .md extension
            
        Returns:
            bool: True if conversion successful
        """
        try:
            if not tex_file.exists():
                raise FileNotFoundError(f"LaTeX file not found: {tex_file}")
                
            if not output_file:
                output_file = tex_file.with_suffix('.md')
                    
            # Verify all required files exist
            if not self._verify_files_exist():
                raise FileNotFoundError("Missing required pandoc configuration files")
                    
            # Create temporary directory for conversion
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_dir = Path(temp_dir)
                
                # Copy LaTeX file to temp directory
                temp_tex = temp_dir / tex_file.name
                shutil.copy2(tex_file, temp_tex)
                if not temp_tex.exists():
                    raise RuntimeError(f"Failed to copy LaTeX file to temp directory: {temp_tex}")
                
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
                    error_msg = result.stderr.strip() or "Unknown pandoc error"
                    raise RuntimeError(f"Pandoc conversion failed: {error_msg}")
                
                # Verify output file was created and not empty
                if not output_file.exists():
                    raise RuntimeError(f"Output file not created: {output_file}")
                if output_file.stat().st_size == 0:
                    raise RuntimeError(f"Output file is empty: {output_file}")
                    
                logger.success(f"Successfully converted {tex_file} to {output_file}")
                return True
                
        except Exception as e:
            logger.error(f"Error converting {tex_file} to Markdown: {e}")
            raise

def create_default_config(paper_dir: Path) -> PandocConfig:
    """Create default Pandoc configuration for a paper directory."""
    media_dir = paper_dir / "media"
    return PandocConfig(extract_media_dir=media_dir)
