# scripts/process_enrichments.py
"""
Fetches GitHub issues with specified labels and converts JSON bodies to dicts.
"""
import json
from typing import Iterator
from github import Github
from loguru import logger
from dataclasses import dataclass
from typing import Iterator
from pathlib import Path


@dataclass
class Paper:
    """
    Represents an arXiv paper with its associated features.
    
    Args:
        arxiv_id: The arXiv ID of the paper
        data_dir: Root directory containing paper data (default: data/papers)
    """
    arxiv_id: str
    data_dir: Path = Path("data/papers")
    
    def __post_init__(self):
        self.paper_dir = self.data_dir / self.arxiv_id
        self.features_dir = self.paper_dir / "features"
        
    @property
    def pdf_path(self) -> Path:
        """Path to the paper's PDF file."""
        return self.paper_dir / f"{self.arxiv_id}.pdf"
    
    @property
    def available_features(self) -> set[str]:
        """Returns set of available feature types for this paper."""
        if not self.features_dir.exists():
            return set()
            
        return {
            d.name for d in self.features_dir.iterdir() 
            if d.is_dir() and any(d.iterdir())
        }
        
    def has_feature(self, feature_name: str) -> bool:
        """Check if a specific feature is available."""
        return feature_name in self.available_features
        
    def feature_path(self, feature_type: str) -> Path | None:
        """
        Get path to a specific feature file if it exists.
        
        Args:
            feature_type: Name of the feature directory (e.g., 'markdown-grobid')
            
        Returns:
            Path to the feature file, or None if not found
        """
        feature_dir = self.features_dir / feature_type
        if not feature_dir.exists():
            return None
            
        # Look for any file with matching arxiv_id prefix
        for file in feature_dir.iterdir():
            if file.stem == self.arxiv_id:
                return file
                
        return None
        
    def __str__(self) -> str:
        features = ", ".join(sorted(self.available_features)) or "none"
        return f"Paper({self.arxiv_id}, features: {features})"
        
    @classmethod
    def iter_papers(cls, data_dir: Path | str = "data/papers") -> Iterator[Paper]:
        """
        Yields Paper objects for all papers in the project.
        
        Args:
            data_dir: Root directory containing paper data
        """
        data_dir = Path(data_dir)
        if not data_dir.exists():
            return
            
        for paper_dir in data_dir.iterdir():
            if paper_dir.is_dir():
                yield cls(arxiv_id=paper_dir.name, data_dir=data_dir)


def get_labeled_issues(
    label: str,
    token: str | None = None,
    repo: str| None = None,
) -> Iterator[dict]:
    """
    Yields issue bodies as dicts for open issues matching the given label.
    """
    token = token or os.environ["GITHUB_TOKEN"]
    repo = repo or os.environ["GITHUB_REPOSITORY"]
    g = Github(token)
    repository = g.get_repo(repo)
    
    for issue in repository.get_issues(labels=[label], state="open"):
        try:
            yield json.loads(issue.body)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse issue {issue.number}: {e}")
            continue


def main():
    requested_features = [for issue in get_labeled_issues("feature-node")]
    for paper in Paper.iter_papers():
        for feat_req in requested_features:
            if not paper.has_feature(feat_req['name']):
                logger.info(feat_req, paper)
                
