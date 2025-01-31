# Python Project Structure

## data/papers/2405.21060/source/structure/code.py
```python
def segsum(x)
    """
    Naive segment sum calculation. exp(segsum(A)) produces a 1-SS matrix,
    which is equivalent to a scalar SSM.
    """

def ssd(X, A, B, C, block_len, initial_states)
    """
    Arguments:
        X: (batch, length, n_heads, d_head)
        A: (batch, length, n_heads)
        B: (batch, length, n_heads, d_state)
        C: (batch, length, n_heads, d_state)
    Return:
        Y: (batch, length, n_heads, d_head)
    """

```

## data/papers/2406.01981/source/figures/plots.py
```python
def bar_chat_1_4B_pythia_vs_zyda()

def ablations_410m_barchart()

def pythia_zyda_scaling_plot()

def ablations_plot()

def deduplication_ablations()

```

## data/papers/2412.06264/source/assets/demo.py
```python
class Flow

    def __init__(self, dim: int, h: int)

    def forward(self, x_t: Tensor, t: Tensor) -> Tensor

    def step(self, x_t: Tensor, t_start: Tensor, t_end: Tensor) -> Tensor


```

## frontend/scripts/convert_data.py
```python
def convert_data(yaml_path: str, json_path: str) -> None
    """
    Convert YAML data file to JSON.
    Args:
        yaml_path: Path to input YAML file
        json_path: Path where JSON should be written
    """

def format_authors(authors: str | list[str]) -> str
    """Format author list consistently."""

```

## frontend/scripts/convert_store.py
```python
def format_authors(authors: str) -> str
    """Format author list consistently."""

def get_reading_time(interactions: list[dict[[str, Any]]]) -> int
    """Calculate total reading time from interaction records."""

def process_paper(paper_id: str, paper_data: dict[[str, Any]], interactions: list[dict[[str, Any]]]) -> dict[[str, Any]]
    """Process single paper data into frontend format."""

def convert_store(snapshot_path: str, output_path: str, archive_path: str | None) -> None
    """
    Convert gh-store snapshot to frontend JSON format.
    Args:
        snapshot_path: Path to gh-store snapshot JSON
        output_path: Path where frontend JSON should be written
    """

```

## scripts/toggle_issues.py
```python
def reopen_issue_with_webhook(issue_number: int) -> None
    """Reopen an issue using the REST API to ensure webhook triggering."""

```
