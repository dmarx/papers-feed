#!/usr/bin/env python3
import os
import json
import yaml
from pathlib import Path
from datetime import datetime
from loguru import logger
from llamero.utils import commit_and_push

def read_metadata(issue_body):
    """Extract the metadata JSON block from issue body."""
    return json.loads(issue_body)

def process_reading_session(issue_data, registry):
    """Process a reading session event and update paper statistics."""
    try:
        session_data = read_metadata(issue_data['body'])
        arxiv_id = session_data.get('arxivId')
        
        if not arxiv_id or arxiv_id not in registry:
            logger.error(f"Invalid arXiv ID or paper not found in registry: {arxiv_id}")
            return False
            
        # Initialize reading_sessions list if it doesn't exist
        if 'reading_sessions' not in registry[arxiv_id]:
            registry[arxiv_id]['reading_sessions'] = []
            
        # Add new session
        session_info = {
            'timestamp': session_data['timestamp'],
            'duration_minutes': session_data['duration_minutes'],
            'issue_url': issue_data['html_url']
        }
        registry[arxiv_id]['reading_sessions'].append(session_info)
        
        # Update total reading time
        total_time = sum(s['duration_minutes'] for s in registry[arxiv_id]['reading_sessions'])
        registry[arxiv_id]['total_reading_time_minutes'] = total_time
        
        # Update last_read timestamp
        registry[arxiv_id]['last_read'] = session_data['timestamp']
        
        return True
        
    except Exception as e:
        logger.error(f"Error processing reading session: {e}")
        return False

def update_papers_registry(issue_data, registry_file='data/papers.yaml'):
    """Update the papers registry with new issue data."""
    registry_path = Path(registry_file)
    
    # Create/load registry
    if registry_path.exists():
        with registry_path.open('r') as f:
            registry = yaml.safe_load(f) or {}
    else:
        registry_path.parent.mkdir(exist_ok=True, parents=True)
        registry = {}
    
    # Check if this is a reading session event
    labels = [label['name'] for label in issue_data['labels']]
    if 'reading-session' in labels:
        success = process_reading_session(issue_data, registry)
        if not success:
            return False
    else:
        # Handle regular paper registration
        metadata = read_metadata(issue_data['body'])
        if not metadata:
            logger.error("No valid metadata found in issue")
            return False
        
        # Add issue metadata
        metadata.update({
            'issue_number': issue_data['number'],
            'issue_url': issue_data['html_url'],
            'created_at': issue_data['created_at'],
            'state': issue_data['state'],
            'labels': labels,
            'reading_sessions': [],
            'total_reading_time_minutes': 0
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
