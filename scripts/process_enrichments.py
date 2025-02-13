# scripts/process_enrichments.py
"""
Creates new paper features based on GitHub issue specifications.
"""
import ast
from dataclasses import dataclass
import json
import os
from pathlib import Path
from typing import Iterator

from github import Github
from loguru import logger
from duckduckgo_search import DDGS


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
    def iter_papers(cls, data_dir: Path | str = "data/papers") -> Iterator["Paper"]:
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


@dataclass
class FeatureRequest:
    """Represents a request to create a new feature."""
    name: str
    inputs: dict[str, str]
    prompt: str
    max_len: int = 1024  # Default max length for content
    
    def __post_init__(self):
        if '/' in self.name:
            raise ValueError("Feature name cannot contain '/'")
        if not all(isinstance(v, str) for v in self.inputs.values()):
            raise ValueError("All input mappings must be strings")
    
    @classmethod
    def from_issue(cls, issue_body: str) -> 'FeatureRequest':
        """Creates a FeatureRequest from a GitHub issue body."""
        try:
            # First try standard JSON parsing
            # try:
            #     data = json.loads(issue_body)
            # except json.JSONDecodeError:
            #     # If that fails, try replacing single quotes with double quotes
            #     # but only for the outermost quotes and dict keys
            #     fixed_body = (
            #         issue_body
            #         .replace("{'", '{"')
            #         .replace("'}", '"}')
            #         .replace("':", '":')
            #         .replace("',", '",')
            #     )
            #     data = json.loads(fixed_body)
            data = ast.literal_eval(issue_body)
            
            return cls(
                name=data['name'],
                inputs=data['inputs'],
                prompt=data['prompt'],
                max_len=data.get('max_len', 1024)
            )
        except (json.JSONDecodeError, KeyError) as e:
            raise ValueError(f"Invalid feature request format: {e}")


def get_github_context() -> tuple[str, str, str]:
    """
    Gets GitHub repository context from Actions environment.
    
    Returns:
        Tuple of (owner, repo, token)
    """
    repo = os.getenv("GITHUB_REPOSITORY")
    if not repo:
        raise RuntimeError("Must be run in GitHub Actions environment")
    
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GitHub token not available")
        
    owner, repo = repo.split("/")
    return owner, repo, token


def get_feature_requests(
    owner: str,
    repo: str,
    label: str = "feature-node",
    feature_name: str | None = None,
    token: str | None = None
) -> Iterator[tuple[FeatureRequest, "Issue"]]:
    """
    Yields FeatureRequest objects from labeled GitHub issues.
    
    Args:
        owner: Repository owner
        repo: Repository name
        label: Base label to filter issues
        feature_name: If provided, also filter by feature:<name> label
        token: GitHub token
    """
    g = Github(token) if token else Github()
    repository = g.get_repo(f"{owner}/{repo}")
    
    labels = [label]
    if feature_name:
        labels.append(f"feature:{feature_name}")
    
    for issue in repository.get_issues(labels=labels, state="all"):
        try:
            yield FeatureRequest.from_issue(issue.body), issue
        except ValueError as e:
            logger.warning(f"Skipping issue {issue.number}: {e}")
            continue


def handle_missing_features(
    owner: str,
    repo: str,
    missing_features: set[str],
    token: str | None = None
) -> None:
    """
    Reopens feature creation issues for missing features.
    
    Args:
        owner: Repository owner
        repo: Repository name
        missing_features: Set of feature names that need to be created
        token: GitHub token
    """
    g = Github(token) if token else Github()
    repository = g.get_repo(f"{owner}/{repo}")
    
    # Track which features we've handled to avoid duplicate reopens
    handled_features = set()
    
    for feature in missing_features:
        if feature in handled_features:
            continue
            
        # Find the feature creation issue
        for request, issue in get_feature_requests(
            owner, repo, feature_name=feature, token=token
        ):
            if issue.state == "closed":
                logger.info(f"Reopening issue for feature: {feature}")
                issue.edit(state="open")
                handled_features.add(feature)
                break
        else:
            logger.warning(f"No creation issue found for feature: {feature}")


def create_feature(
    paper: Paper,
    request: FeatureRequest,
    owner: str,
    repo: str,
    token: str | None = None,
    reopen_dependencies: bool = True
) -> bool:
    """
    Creates a new feature for a paper based on the feature request.
    
    Args:
        paper: Paper object to create feature for
        request: Feature request specification
        owner: Repository owner (for dependency reopening)
        repo: Repository name (for dependency reopening)
        token: GitHub token (for dependency reopening)
        reopen_dependencies: Whether to reopen issues for missing dependencies
        
    Returns:
        True if feature was created successfully
    """
    missing_features = set()
    
    # Check if all required input features exist
    for feature_path in request.inputs:
        feature_type = feature_path.split('/')[1]
        if not paper.has_feature(feature_type):
            missing_features.add(feature_type)
            
    if missing_features and reopen_dependencies:
        handle_missing_features(owner, repo, missing_features, token)
        return False
    elif missing_features:
        logger.warning(
            f"Paper {paper.arxiv_id} missing required features: {missing_features}"
        )
        return False
            
    # Create feature directory
    feature_dir = paper.features_dir / request.name
    feature_dir.mkdir(parents=True, exist_ok=True)
    
    # Read input features and format prompt
    input_contents = {}
    for feature_path, var_name in request.inputs.items():
        feature_type = feature_path.split('/')[1]
        path = paper.feature_path(feature_type)
        if path and path.exists():
            content = path.read_text()
            # Truncate content if needed
            if request.max_len > 0:
                available_len = request.max_len - len(request.prompt)
                if len(content) > available_len:
                    logger.warning(
                        f"Truncating content for {paper.arxiv_id} "
                        f"from {len(content)} to {available_len} chars"
                    )
                content = content[:available_len]
            input_contents[var_name] = content
    
    # Format prompt with input contents
    formatted_prompt = request.prompt.format(**input_contents)
    
    # Send to DuckDuckGo chat
    ddg = DDGS()
    try:
        response = ddg.chat(formatted_prompt)
        output_path = feature_dir / f"{paper.arxiv_id}.md"
        output_path.write_text(response)
        logger.info(f"Created {request.name} feature for {paper.arxiv_id}")
        return True
    except Exception as e:
        logger.error(f"Chat API error for {paper.arxiv_id}: {e}")
        return False


def process_feature_requests(
    data_dir: Path | str = "data/papers"
) -> None:
    """
    Process all open feature requests for all papers.
    """
    owner, repo, token = get_github_context()
    requests = []
    for request, _ in get_feature_requests(owner, repo, token=token):
        requests.append(request)
    logger.info(f"Found {len(requests)} feature requests")
    
    for paper in Paper.iter_papers(data_dir):
        for request in requests:
            create_feature(paper, request, owner, repo, token)


if __name__ == "__main__":
    from fire import Fire
    
    def main(data_dir: str = "data/papers"):
        """CLI entry point to process feature requests."""
        process_feature_requests(data_dir)
        
    Fire(main)
