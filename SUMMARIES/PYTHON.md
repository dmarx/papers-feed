# Python Project Structure

## frontend/scripts/convert_data.py
```python
def format_authors(authors: str | list[str]) -> str
    """Format author list consistently."""

def scan_features(paper_id: str, features_base: Path) -> dict[[str, str]]
    """
    Scan for available features for a paper.
    Args:
        paper_id: Paper ID to scan features for
        features_base: Base directory containing paper data
    Returns:
        Dictionary mapping feature types to their content paths
    """

def convert_data(yaml_path: str, json_path: str, features_base: str) -> None
    """
    Convert YAML data file to JSON.
    Args:
        yaml_path: Path to input YAML file
        json_path: Path where JSON should be written
        features_base: Base directory containing paper data and features
    """

```

## frontend/scripts/convert_store.py
```python
def format_authors(authors: str) -> str
    """Format author list consistently."""

def get_reading_time(interactions: list[dict[[str, Any]]]) -> int
    """Calculate total reading time from interaction records."""

def scan_features(paper_id: str, features_base: Path) -> dict[[str, str]]
    """
    Scan for available features for a paper and ensure paper directory exists.
    Args:
        paper_id: Paper ID to scan features for
        features_base: Base directory containing paper data
    Returns:
        Dictionary mapping feature types to their content paths
    """

def process_paper(paper_id: str, paper_data: dict[[str, Any]], interactions: list[dict[[str, Any]]], features_base: Path) -> dict[[str, Any]]
    """Process single paper data into frontend format."""

def convert_store(snapshot_path: str, output_path: str, archive_path: str | None, features_base: str) -> None
    """
    Convert gh-store snapshot to frontend JSON format.
    Args:
        snapshot_path: Path to gh-store snapshot JSON
        output_path: Path where frontend JSON should be written
        archive_path: Optional path to archive JSON to merge with
        features_base: Base directory containing paper data and features
    """

```

## scripts/process_enrichments.py
```python
@dataclass
class Paper
    """
    Represents an arXiv paper with its associated features.
    Args:
        arxiv_id: The arXiv ID of the paper
        data_dir: Root directory containing paper data (default: data/papers)
    """

    def __post_init__(self)

    @property
    def pdf_path(self) -> Path
        """Path to the paper's PDF file."""

    @property
    def available_features(self) -> set[str]
        """Returns set of available feature types for this paper."""

    def has_feature(self, feature_name: str) -> bool
        """Check if a specific feature is available."""

    def feature_path(self, feature_type: str) -> Path | None
        """
        Get path to a specific feature file if it exists.
        Args:
            feature_type: Name of the feature directory (e.g., 'markdown-grobid')
        Returns:
            Path to the feature file, or None if not found
        """

    def __str__(self) -> str

    @classmethod
    def iter_papers(cls, data_dir: Path | str) -> Iterator['Paper']
        """
        Yields Paper objects for all papers in the project.
        Args:
            data_dir: Root directory containing paper data
        """


@dataclass
class FeatureRequest
    """Represents a request to create a new feature."""

    def __post_init__(self)

    @classmethod
    def from_issue(cls, issue_body: str) -> 'FeatureRequest'
        """Creates a FeatureRequest from a GitHub issue body."""


def get_github_context() -> tuple[[str, str, str]]
    """
    Gets GitHub repository context from Actions environment.
    Returns:
        Tuple of (owner, repo, token)
    """

def get_feature_requests(owner: str, repo: str, label: str, feature_name: str | None, token: str | None) -> Iterator[tuple[[FeatureRequest, 'Issue']]]
    """
    Yields FeatureRequest objects from labeled GitHub issues.
    Args:
        owner: Repository owner
        repo: Repository name
        label: Base label to filter issues
        feature_name: If provided, also filter by feature:<name> label
        token: GitHub token
    """

def handle_missing_features(owner: str, repo: str, missing_features: set[str], token: str | None) -> None
    """
    Reopens feature creation issues for missing features.
    Args:
        owner: Repository owner
        repo: Repository name
        missing_features: Set of feature names that need to be created
        token: GitHub token
    """

def create_feature(paper: Paper, request: FeatureRequest, owner: str, repo: str, token: str | None, reopen_dependencies: bool) -> bool
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

def process_feature_requests(data_dir: Path | str) -> None
    """Process all open feature requests for all papers."""

def main(data_dir: str)
    """CLI entry point to process feature requests."""

```

## scripts/process_pdf.py
```python
def remove_extra_whitespace(text: str) -> str

def remove_gibberish(text: str, cutoff) -> str

def sanitize_markdown(text: str) -> str

def get_feature_path(base_path: Path, feature_type: str, paper_id: str, ext: str) -> Path
    """Create feature directory if it doesn't exist and return the full path."""

def process_pdf_grobid(pdf_path: str, format: OutputFormat, tag: str, output_path: str | None, regenerate_tei: bool) -> None
    """
    Process a PDF file using Grobid and convert to the specified format.
    Output files will be saved in feature-specific directories:
    - TEI XML files go to features/tei-xml-grobid/
    - Markdown files go to features/markdown-grobid/
    Args:
        pdf_path: Path to the PDF file relative to the repository root.
        format: Output format, either 'markdown' or 'tei'.
        tag: Optional tag to append to the output filename (default: "grobid").
        output_path: Optional path where the output file should be saved. If provided,
            this overrides the default feature directory behavior.
        regenerate_tei: Whether to regenerate TEI XML even if it exists.
    """

def generate_missing_conversions(data_path: str, tag: str, checkpoint_cadence, regenerate_tei: bool)
    """Generate missing conversions for PDFs, saving outputs to feature directories."""

```

## scripts/process_task.py
```python
def with_prompt(target: str | Path, prompt: str, max_len: int)

@dataclass
class TaskConfig

def main(config: dict)

```

## scripts/toggle_issues.py
```python
def reopen_issue_with_webhook(issue_number: int) -> None
    """Reopen an issue using the REST API to ensure webhook triggering."""

```
