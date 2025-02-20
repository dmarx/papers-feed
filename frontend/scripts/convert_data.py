# frontend/scripts/convert_data.py
"""Convert papers YAML to JSON for web consumption."""

import yaml
import json
from pathlib import Path
import fire

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

def scan_features(paper_id: str, features_base: Path) -> dict[str, str]:
    """
    Scan for available features for a paper.
    
    Args:
        paper_id: Paper ID to scan features for
        features_base: Base directory containing paper data
        
    Returns:
        Dictionary mapping feature types to their content paths
    """
    paper_dir = features_base / paper_id
    features_dir = paper_dir / "features"
    
    if not features_dir.exists():
        return {}
    
    features = {}
    for feature_dir in features_dir.iterdir():
        if not feature_dir.is_dir():
            continue
            
        # Look for markdown file matching paper ID
        feature_files = list(feature_dir.glob(f"{paper_id}*.md"))
        if feature_files:
            # Use relative path from web root
            rel_path = feature_files[0].relative_to(features_base.parent)
            features[feature_dir.name] = str(rel_path)
            
    return features

def convert_data(
    yaml_path: str,
    json_path: str,
    features_base: str = "data/papers"
) -> None:
    """Convert YAML data file to JSON.
    
    Args:
        yaml_path: Path to input YAML file
        json_path: Path where JSON should be written
        features_base: Base directory containing paper data and features
    """
    yaml_path = Path(yaml_path)
    json_path = Path(json_path)
    features_base = Path(features_base)
    
    # Create output directory if needed
    json_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Read and parse YAML
    with open(yaml_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    # Preprocess data for frontend consumption
    processed_data = {}
    for paper_id, paper in data.items():
        if paper.get('last_read') or paper.get('last_visited'):
            # Get feature paths for this paper
            features_path = scan_features(paper_id, features_base)
            
            processed_data[paper_id] = {
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
                'features_path': features_path or None  # Only include if features exist
            }
    
    # Write JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    fire.Fire(convert_data)
