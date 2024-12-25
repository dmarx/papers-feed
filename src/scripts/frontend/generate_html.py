# generate_html.py
import yaml
import json
from pathlib import Path

def main():
    # Read the papers YAML
    papers_path = Path('data/papers.yaml')
    with open(papers_path, 'r', encoding='utf-8') as f:
        papers = yaml.safe_load(f)
    
    # Read the template
    template_path = Path('index.template.html')
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
    output_path = Path('index.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

if __name__ == '__main__':
    main()
