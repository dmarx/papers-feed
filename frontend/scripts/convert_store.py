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

def process_paper(paper_id: str, paper_data: dict[str, Any], interactions: list[dict[str, Any]]) -> dict[str, Any]:
    """Process single paper data into frontend format."""
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
        'arxiv_tags': paper_data.get('arxiv_tags', [])
    }

def convert_store(
    snapshot_path: str,
    output_path: str,
    archive_path: str | None,
) -> None:
    """Convert gh-store snapshot to frontend JSON format.
    
    Args:
        snapshot_path: Path to gh-store snapshot JSON
        output_path: Path where frontend JSON should be written
    """
    snapshot_path = Path(snapshot_path)
    output_path = Path(output_path)
    archive_path = Path(archive_path)
    
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
        papers[paper_id] = process_paper(paper_id, paper_data, interactions)
    
    # Backpopulate from archive if provided
    papers_new = papers
    if archive_path:
        with open(archive_path, 'r', encoding='utf-8') as f:
            papers = json.load(f)
        papers.update(papers_new)
            
    # Write output
    logger.info(f"Writing {len(papers)} papers to {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(papers, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    fire.Fire(convert_store)
