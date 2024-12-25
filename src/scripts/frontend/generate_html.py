# src/scripts/frontend/generate_html.py
import yaml
import json
from pathlib import Path
import fire
from typing import Optional, Dict, Any
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

def truncate_text(text: str, max_length: int = 300) -> str:
    """Truncate text to specified length with ellipsis."""
    if not text:
        return ''
    if len(text) <= max_length:
        return text
    return f"{text[:max_length-3]}..."

def preprocess_paper(paper: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single paper entry."""
    return {
        'id': paper.get('arxivId', ''),
        'title': paper.get('title', '').replace('\n', ' '),
        'authors': format_authors(paper.get('authors', [])),
        'abstract': truncate_text(paper.get('abstract', '').replace('\n', ' ')),
        'url': paper.get('url', ''),
        'arxivId': paper.get('arxivId', ''),
        'last_read': paper.get('last_read', ''),
        'total_reading_time_seconds': paper.get('total_reading_time_seconds', 0)
    }

def preprocess_papers(papers: Dict[str, Any]) -> Dict[str, Any]:
    """Process all papers and prepare them for display."""
    # Filter for read papers and sort by last_read date
    read_papers = {
        id_: paper for id_, paper in papers.items()
        if paper.get('last_read')
    }
    
    # Process each paper
    processed_papers = {
        id_: preprocess_paper(paper)
        for id_, paper in read_papers.items()
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
