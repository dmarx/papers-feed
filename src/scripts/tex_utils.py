# scripts/tex_utils.py
"""TeX file utilities for arXiv paper processing."""

import re
from pathlib import Path
from loguru import logger
from dataclasses import dataclass
from typing import Sequence

@dataclass
class TeXFileScore:
    """Score details for a TeX file candidate."""
    path: Path
    score: int
    reasons: list[str]



# Common ML conference and file patterns
ML_MAIN_FILE_NAMES = {
    # Standard names
    'main.tex', 'paper.tex', 'article.tex', 'manuscript.tex',
    'submission.tex', 'arxiv.tex', 'draft.tex', 'final.tex',
    # ML/AI Conference specific
    'neurips.tex', 'neurips_main.tex', 'neurips_camera_ready.tex',
    'iclr.tex', 'iclr_main.tex', 'iclr_conference.tex', 
    'icml.tex', 'icml_final.tex', 'icml_conference.tex',
    'aaai.tex', 'aaai_submission.tex', 'aaai_camera_ready.tex',
    'acl.tex', 'acl_main.tex', 'acl_camera_ready.tex',
    'emnlp.tex', 'emnlp_main.tex', 'emnlp_final.tex',
    'cvpr.tex', 'cvpr_main.tex', 'cvpr_final.tex',
    'iccv.tex', 'iccv_main.tex', 'iccv_camera_ready.tex',
    'eccv.tex', 'eccv_main.tex', 'eccv_submission.tex',
    'mlsys.tex', 'ml4ps.tex', 'ml4md.tex', 'aistats.tex',
}

ML_CONFERENCE_PATTERNS = [
    # Major ML conferences
    r'neurips.*(?:conference|final|main)',
    r'iclr.*(?:conference|final|main)',
    r'icml.*(?:conference|final|main)',
    # NLP conferences
    r'acl.*(?:conference|final|main)',
    r'emnlp.*(?:conference|final|main)',
    r'naacl.*(?:conference|final|main)',
    # Vision conferences
    r'cvpr.*(?:conference|final|main)',
    r'iccv.*(?:conference|final|main)',
    r'eccv.*(?:conference|final|main)',
    # AI conferences
    r'aaai.*(?:conference|final|main)',
    r'ijcai.*(?:conference|final|main)',
    # Systems and specialized
    r'mlsys.*(?:conference|final|main)',
    r'kdd.*(?:conference|final|main)',
    r'aistats.*(?:conference|final|main)',
]

def score_tex_file(tex_file: Path) -> TeXFileScore:
    """Score a single TeX file based on ML-focused heuristics."""
    score = 0
    reasons: list[str] = []
    
    try:
        content = tex_file.read_text(encoding='utf-8', errors='ignore')
        
        # File name scoring
        if tex_file.name.lower() in ML_MAIN_FILE_NAMES:
            score += 3
            reasons.append(f"Main filename match (+3): {tex_file.name}")
        
        # Conference pattern scoring
        for pattern in ML_CONFERENCE_PATTERNS:
            if re.search(pattern, tex_file.name.lower()):
                score += 3
                reasons.append(f"Conference pattern match (+3): {pattern}")
        
        # Document structure
        if r'\documentclass' in content:
            score += 5
            reasons.append("Has documentclass (+5)")
        if r'\begin{document}' in content:
            score += 4
            reasons.append("Has begin{document} (+4)")
        if r'\end{document}' in content:
            score += 4
            reasons.append("Has end{document} (+4)")
        
        # Negative indicators
        input_count = len(re.findall(r'\\input{', content))
        include_count = len(re.findall(r'\\include{', content))
        if input_count + include_count > 0:
            penalty = -2 if input_count + include_count > 2 else -1
            score += penalty
            reasons.append(f"Input/include commands ({penalty})")
        
        # File size scoring
        file_size = len(content)
        size_score = 0
        if file_size > 50000:
            size_score = 4
        elif file_size > 20000:
            size_score = 3
        elif file_size > 10000:
            size_score = 2
        elif file_size > 5000:
            size_score = 1
        if size_score > 0:
            score += size_score
            reasons.append(f"File size {file_size/1000:.1f}KB (+{size_score})")
            
    except Exception as e:
        logger.debug(f"Error processing {tex_file}: {e}")
        return TeXFileScore(tex_file, 0, [f"Error: {str(e)}"])
    
    return TeXFileScore(tex_file, score, reasons)

def find_main_tex_file(tex_files: Sequence[Path], arxiv_id: str = "unknown") -> Path | None:
    """
    Find the most likely main TeX file from a list of candidates.
    
    Args:
        tex_files: List of TeX file paths to evaluate
        arxiv_id: ArXiv ID for logging context
    
    Returns:
        Path to the most likely main TeX file, or None if no valid candidates
    """
    if not tex_files:
        return None
    
    # Score all files
    scored_files = [score_tex_file(f) for f in tex_files]
    
    # Log detailed scoring
    logger.debug(f"\nTeX file scoring for {arxiv_id}:")
    for result in scored_files:
        logger.debug(f"\n{result.path.name}: Total Score = {result.score}")
        for reason in result.reasons:
            logger.debug(f"  {reason}")
    
    # Filter and sort files
    valid_files = [f for f in scored_files if f.score >= 10]  # Minimum score threshold
    if not valid_files:
        return None
        
    valid_files.sort(key=lambda x: x.score, reverse=True)
    return valid_files[0].path
