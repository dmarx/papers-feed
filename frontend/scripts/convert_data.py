# frontend/scripts/convert_data.py
"""Convert papers YAML to JSON for web consumption."""

import yaml
import json
from pathlib import Path
import fire

def convert_data(
    yaml_path: str,
    json_path: str,
) -> None:
    """Convert YAML data file to JSON.
    
    Args:
        yaml_path: Path to input YAML file
        json_path: Path where JSON should be written
    """
    yaml_path = Path(yaml_path)
    json_path = Path(json_path)
    
    # Create output directory if needed
    json_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Read and parse YAML
    with open(yaml_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    # Preprocess data for frontend consumption
    processed_data = {
        paper_id: {
            'id': paper_id,
            'title': paper.get('title', '').replace('\n', ' '),
            'authors': format_authors(paper.get('authors', [])),
            'abstract': paper.get('abstract', '').replace('\n', ' '),
            'url': paper.get('url', ''),
            'arxivId': paper.get('arxivId', ''),
            'last_visited': paper.get('last_visited', ''),
            'last_read': paper.get('last_read', ''),
            'total_reading_time_seconds': paper.get('total_reading_time_seconds', 0),
            'published_date': paper.get('published_date', ''),
            'arxiv_tags': paper.get('arxiv_tags', []),
        }
        for paper_id, paper in data.items()
        if paper.get('last_read') or paper.get('last_visited')
    }
    
    # Write JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, indent=2, ensure_ascii=False)

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

if __name__ == '__main__':
    fire.Fire(convert_data)
