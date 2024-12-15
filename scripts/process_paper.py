#!/usr/bin/env python3
import os
import json
import yaml
from pathlib import Path
from loguru import logger
from llamero.utils import commit_and_push

def extract_metadata_block(issue_body):
    """Extract the metadata JSON block from issue body."""
    try:
        # Split the body into sections
        sections = issue_body.split('```')
        # Find the json section
        for i, section in enumerate(sections):
            if section.strip().startswith('json'):
                # Get the JSON content
                json_content = sections[i + 1]
                return json.loads(json_content)
    except (IndexError, json.JSONDecodeError) as e:
        logger.error(f"Failed to parse metadata: {e}")
        return None

def update_papers_registry(issue_data, registry_file='papers.yaml'):
    """Update the papers registry with new issue data."""
    registry_path = Path(registry_file)
    
    # Create/load registry
    if registry_path.exists():
        with registry_path.open('r') as f:
            registry = yaml.safe_load(f) or {}
    else:
        registry = {}
    
    # Extract metadata from issue body
    metadata = extract_metadata_block(issue_data['body'])
    if not metadata:
        logger.error("No valid metadata found in issue")
        return False
    
    # Add issue metadata
    metadata.update({
        'issue_number': issue_data['number'],
        'issue_url': issue_data['html_url'],
        'created_at': issue_data['created_at'],
        'state': issue_data['state'],
        'labels': [label['name'] for label in issue_data['labels']]
    })
    
    # Use arXiv ID as key
    arxiv_id = metadata.get('arxivId')
    if not arxiv_id:
        logger.error("No arXiv ID found in metadata")
        return False
    
    # Update registry
    registry[arxiv_id] = metadata
    
    # Save updated registry
    with registry_path.open('w') as f:
        yaml.safe_dump(registry, f, sort_keys=True, indent=2, allow_unicode=True)
    
    # Commit and push changes
    logger.info(f"Committing changes to {registry_file}")
    commit_and_push(registry_file)
    
    return True

def main():
    """Main entry point for processing paper issues."""
    # Get issue data from environment
    issue_data_path = os.environ.get('GITHUB_EVENT_PATH')
    if not issue_data_path:
        logger.error("No GITHUB_EVENT_PATH found")
        exit(1)
    
    # Load issue data
    with open(issue_data_path) as f:
        event_data = json.load(f)
    
    issue_data = event_data.get('issue')
    if not issue_data:
        logger.error("No issue data found in event")
        exit(1)
    
    # Process the issue
    success = update_papers_registry(issue_data)
    if not success:
        logger.error("Failed to process issue")
        exit(1)
    
    logger.success("Successfully processed paper issue")

if __name__ == '__main__':
    main()
