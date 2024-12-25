# src/scripts/frontend/generate_html.py
import yaml
import json
from pathlib import Path
import fire
from typing import Optional

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
    
    # Read the template
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
    
    # Convert papers to JSON for JavaScript
    papers_json = json.dumps(papers, indent=2, ensure_ascii=False)
    
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
