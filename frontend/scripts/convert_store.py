# frontend/scripts/convert_store.py
"""Convert gh-store snapshot to frontend JSON format."""

import json
from pathlib import Path
import fire
from loguru import logger
from typing import Any

def format_authors(authors: str) -> str:
    """Format author list consistently."""
    author_list = [a.strip() for a in authors.split(',')]
    
    if len(author_list) > 4:
        return f"{', '.join(author_list[:3])} and {len(author_list) - 3} others"
    return ', '.join(author_list)

def get_reading_time(interactions: list[dict[str, Any]]) -> int:
    """Calculate total reading time from interaction records."""
    total_seconds = 0
    for interaction in interactions:
        if interaction['type'] == 'reading_session':
            if isinstance(interaction['data'], dict):
                total_seconds += interaction['data'].get('duration_seconds', 0)
    return total_seconds

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

def process_paper(
    paper_id: str, 
    paper_data: dict[str, Any], 
    interactions: list[dict[str, Any]],
    features_base: Path
) -> dict[str, Any]:
    """Process single paper data into frontend format."""
    # Get feature paths
    features_path = scan_features(paper_id, features_base)
    
    return {
        'id': paper_id,
        'title': paper_data.get('title', '').replace('\n', ' '),
        'authors': format_authors(paper_data.get('authors', '')),
        'abstract': paper_data.get('abstract', '').replace('\n', ' '),
        'url': paper_data.get('url', ''),
        'arxivId': paper_data.get('arxivId', ''),
        'last_visited': paper_data.get('timestamp', ''),
        'last_read': paper_data.get('timestamp', ''),  # Using same timestamp for now
        'total_reading_time_seconds': get_reading_time(interactions),
        'published_date': paper_data.get('published_date', ''),
        'arxiv_tags': paper_data.get('arxiv_tags', []),
        'features_path': features_path or None  # Only include if features exist
    }

def convert_store(
    snapshot_path: str,
    output_path: str,
    archive_path: str | None = None,
    features_base: str = "data/papers"
) -> None:
    """Convert gh-store snapshot to frontend JSON format.
    
    Args:
        snapshot_path: Path to gh-store snapshot JSON
        output_path: Path where frontend JSON should be written
        archive_path: Optional path to archive JSON to merge with
        features_base: Base directory containing paper data and features
    """
    snapshot_path = Path(snapshot_path)
    output_path = Path(output_path)
    features_base = Path(features_base)
    
    # Create output directory
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Read snapshot
    logger.info(f"Reading snapshot from {snapshot_path}")
    with open(snapshot_path, 'r', encoding='utf-8') as f:
        snapshot = json.load(f)
    
    # Process papers
    papers = {}
    interaction_data = {}
    
    # First pass - collect interaction data
    for obj_id, obj in snapshot['objects'].items():
        if obj_id.startswith('interactions:'):
            paper_id = obj_id.split(':', 1)[1]
            interaction_data[paper_id] = obj['data']['interactions']
    
    # Second pass - process papers with their interactions
    for obj_id, obj in snapshot['objects'].items():
        if not obj_id.startswith('paper:'):
            continue
            
        paper_id = obj_id.split(':', 1)[1]
        paper_data = obj['data']
        interactions = interaction_data.get(paper_id, [])
        papers[paper_id] = process_paper(
            paper_id, 
            paper_data, 
            interactions,
            features_base
        )
    
    # Backpopulate from archive if provided
    logger.info(f"Loaded {len(papers)} from snapshot")
    if archive_path:
        logger.info(f"Reading archive from {archive_path}")
        with open(archive_path, 'r', encoding='utf-8') as f:
            archive = json.load(f)
        logger.info(f"Loaded {len(archive)} from archive")
        
        # Update archived papers with new feature paths
        for paper_id, paper in archive.items():
            new_features = scan_features(paper_id, features_base)
            if new_features:
                paper['features_path'] = new_features
                
        archive.update(papers)
        papers = archive
            
    # Write output
    logger.info(f"Writing {len(papers)} papers to {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(papers, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    fire.Fire(convert_store)
