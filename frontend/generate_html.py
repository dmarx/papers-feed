# src/scripts/frontend/generate_html.py
import yaml
import json
from pathlib import Path
import fire
from typing import Dict, Any
from datetime import datetime

def format_authors(authors: str | list[str]) -> str:
    """Format author list consistently."""
    if isinstance(authors, str):
        author_list = [a.strip() for a in authors.split(',')]
    elif isinstance(authors, list):
        author_list = authors
    else:
        return 'Unknown authors'
    
    if len(author_list) > 4:
        return f"{', '.join(author_list[:3])} and {len(author_list) - 3} others"
    return ', '.join(author_list)

def normalize_datetime(date_str: str | None) -> datetime | None:
    """Parse datetime string to UTC datetime and strip timezone info."""
    if not date_str:
        return None
    try:
        # Replace Z with +00:00 for consistent timezone handling
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        # Convert to UTC if timezone aware
        if dt.tzinfo is not None:
            dt = dt.astimezone().replace(tzinfo=None)
        return dt
    except (ValueError, AttributeError):
        return None

def get_last_visited(paper: Dict[str, Any]) -> str:
    """Compute the most recent interaction time for a paper."""
    last_read = normalize_datetime(paper.get('last_read'))
    last_visited = normalize_datetime(paper.get('last_visited'))
    
    # Compare only if both exist
    if last_read and last_visited:
        latest = max(last_read, last_visited)
    elif last_read:
        latest = last_read
    elif last_visited:
        latest = last_visited
    else:
        return ''
    
    return latest.isoformat()

def preprocess_paper(paper: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single paper entry."""
    return {
        'id': paper.get('arxivId', ''),
        'title': paper.get('title', '').replace('\n', ' '),
        'authors': format_authors(paper.get('authors', [])),
        'abstract': paper.get('abstract', '').replace('\n', ' '),
        'url': paper.get('url', ''),
        'arxivId': paper.get('arxivId', ''),
        'last_visited': get_last_visited(paper),
        'last_read': paper.get('last_read', ''),  # Keep for "Read on" display
        'total_reading_time_seconds': paper.get('total_reading_time_seconds', 0),
        'published_date': paper.get('published_date'),
        'arxiv_tags': paper.get('arxiv_tags', []),
    }

def preprocess_papers(papers: Dict[str, Any]) -> Dict[str, Any]:
    """Process all papers and prepare them for display."""
    # Process all papers that have either last_read or last_visited
    processed_papers = {
        id_: preprocess_paper(paper)
        for id_, paper in papers.items()
        if paper.get('last_read') or paper.get('last_visited')
    }
    
    return processed_papers

def generate_html(
    data_path: str,
    template_path: str,
    output_path: str,
) -> None:
    """Generate HTML page from papers data and template.
    
    Args:
        data_path: Path to papers YAML file
        template_path: Path to HTML template file
        output_path: Path where generated HTML should be written
    """
    # Convert all paths to Path objects
    data_path = Path(data_path)
    template_path = Path(template_path)
    output_path = Path(output_path)

    # Create output directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Read the papers YAML
    with open(data_path, 'r', encoding='utf-8') as f:
        papers = yaml.safe_load(f)
    
    # Preprocess the papers data
    processed_papers = preprocess_papers(papers)
    
    # Read the template
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
    
    # Convert processed papers to JSON
    papers_json = json.dumps(
        processed_papers,
        indent=2,
        ensure_ascii=False
    )
    
    # Replace the placeholder in template
    html = template.replace(
        'window.yamlData = {};',
        f'window.yamlData = {papers_json};'
    )
    
    # Write the final HTML
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

if __name__ == '__main__':
    fire.Fire(generate_html)
