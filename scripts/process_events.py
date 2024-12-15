# scripts/process_events.py
import os
import json
import yaml
import asyncio
import aiohttp
from datetime import datetime
from pathlib import Path
from loguru import logger
from llamero.utils import commit_and_push

logger.add("process_events.log", rotation="1 MB")

class EventProcessor:
    def __init__(self):
        logger.info("Initializing EventProcessor")
        self.github_token = os.environ["GITHUB_TOKEN"]
        self.repo = os.environ["GITHUB_REPOSITORY"]
        logger.info(f"Working with repository: {self.repo}")
        
        self.base_headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        self.papers_dir = Path("data/papers")
        self.papers_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Papers directory initialized at: {self.papers_dir}")
        
        self.modified_files = set()
        
    async def get_open_issues(self, session):
        """Fetch all open issues with paper or reading-session labels."""
        url = f"https://api.github.com/repos/{self.repo}/issues"
        params = {
            "state": "open",
            "per_page": 100
        }
        
        logger.info(f"Fetching open issues from: {url}")
        logger.debug(f"Query parameters: {params}")
        
        async with session.get(url, headers=self.base_headers, params=params) as response:
            if response.status == 200:
                all_issues = await response.json()
                logger.info(f"Found {len(all_issues)} total open issues")
                
                # Filter for issues with either 'paper' or 'reading-session' labels
                relevant_issues = [
                    issue for issue in all_issues
                    if any(label['name'] in ['paper', 'reading-session'] 
                          for label in issue['labels'])
                ]
                
                logger.info(f"Found {len(relevant_issues)} issues with relevant labels")
                for issue in relevant_issues:
                    logger.debug(f"Issue #{issue['number']}: {issue['title']} - Labels: {[l['name'] for l in issue['labels']]}")
                return relevant_issues
            else:
                logger.error(f"Failed to fetch issues. Status: {response.status}")
                logger.debug(f"Response: {await response.text()}")
                return []

    def ensure_paper_directory(self, arxiv_id):
        """Create paper directory if it doesn't exist."""
        paper_dir = self.papers_dir / arxiv_id
        if not paper_dir.exists():
            logger.info(f"Creating new paper directory for {arxiv_id}")
            paper_dir.mkdir(parents=True, exist_ok=True)
        else:
            logger.debug(f"Paper directory already exists for {arxiv_id}")
        return paper_dir

    def load_paper_metadata(self, arxiv_id):
        """Load paper metadata from file."""
        metadata_file = self.papers_dir / arxiv_id / "metadata.json"
        logger.debug(f"Attempting to load metadata from: {metadata_file}")
        
        if metadata_file.exists():
            with metadata_file.open('r') as f:
                metadata = json.load(f)
                logger.debug(f"Loaded metadata for {arxiv_id}: {metadata}")
                return metadata
        else:
            logger.info(f"No existing metadata found for {arxiv_id}")
            return None

    def save_paper_metadata(self, arxiv_id, metadata):
        """Save paper metadata to file."""
        metadata_file = self.papers_dir / arxiv_id / "metadata.json"
        logger.info(f"Saving metadata for {arxiv_id}")
        logger.debug(f"Metadata content: {metadata}")
        
        with metadata_file.open('w') as f:
            json.dump(metadata, f, indent=2)
        self.modified_files.add(str(metadata_file))
        logger.info(f"Added {metadata_file} to modified files")

    def append_event(self, arxiv_id, event_data):
        """Append an event to the paper's event log."""
        events_file = self.papers_dir / arxiv_id / "events.log"
        event_line = json.dumps(event_data)
        logger.info(f"Appending event for {arxiv_id}")
        logger.debug(f"Event data: {event_data}")
        
        with events_file.open('a') as f:
            f.write(f"{event_line}\n")
        self.modified_files.add(str(events_file))
        logger.info(f"Added {events_file} to modified files")

    def process_new_paper(self, issue_data):
        """Process a new paper registration."""
        logger.info(f"Processing new paper from issue #{issue_data['number']}: {issue_data['title']}")
        
        try:
            metadata = json.loads(issue_data["body"])
            logger.debug(f"Parsed metadata: {metadata}")
            
            arxiv_id = metadata.get("arxivId")
            if not arxiv_id:
                logger.error("No arXiv ID found in metadata")
                raise ValueError("No arXiv ID found in metadata")

            # Ensure paper directory exists
            paper_dir = self.ensure_paper_directory(arxiv_id)

            # Add issue metadata
            metadata.update({
                "issue_number": issue_data["number"],
                "issue_url": issue_data["html_url"],
                "created_at": issue_data["created_at"],
                "state": issue_data["state"],
                "labels": [label["name"] for label in issue_data["labels"]],
                "total_reading_time_minutes": 0,
                "last_read": None
            })

            # Save metadata
            self.save_paper_metadata(arxiv_id, metadata)

            # Log paper creation event
            event_data = {
                "type": "paper_registered",
                "timestamp": datetime.utcnow().isoformat(),
                "issue_url": issue_data["html_url"],
                "arxiv_id": arxiv_id
            }
            self.append_event(arxiv_id, event_data)
            logger.success(f"Successfully processed new paper {arxiv_id}")
            return True

        except Exception as e:
            logger.exception(f"Error processing new paper: {e}")
            return False

    def process_reading_session(self, issue_data):
        """Process a reading session event."""
        logger.info(f"Processing reading session from issue #{issue_data['number']}: {issue_data['title']}")
        
        try:
            session_data = json.loads(issue_data["body"])
            logger.debug(f"Parsed session data: {session_data}")
            
            arxiv_id = session_data.get("arxivId")
            if not arxiv_id:
                logger.error("No arXiv ID found in session data")
                raise ValueError("No arXiv ID found in session data")

            # Ensure paper exists
            metadata = self.load_paper_metadata(arxiv_id)
            if not metadata:
                logger.error(f"Paper {arxiv_id} not found in registry")
                raise ValueError(f"Paper {arxiv_id} not found in registry")

            # Update reading time stats
            duration_minutes = session_data["duration_minutes"]
            metadata["total_reading_time_minutes"] = (
                metadata.get("total_reading_time_minutes", 0) + duration_minutes
            )
            metadata["last_read"] = session_data["timestamp"]
            
            # Save updated metadata
            self.save_paper_metadata(arxiv_id, metadata)

            # Log reading session event
            event_data = {
                "type": "reading_session",
                "timestamp": session_data["timestamp"],
                "duration_minutes": duration_minutes,
                "issue_url": issue_data["html_url"]
            }
            self.append_event(arxiv_id, event_data)
            logger.success(f"Successfully processed reading session for {arxiv_id}")
            return True

        except Exception as e:
            logger.exception(f"Error processing reading session: {e}")
            return False

    async def close_issue(self, session, issue_number):
        """Close a processed issue."""
        logger.info(f"Attempting to close issue #{issue_number}")
        url = f"https://api.github.com/repos/{self.repo}/issues/{issue_number}"
        
        # Add comment
        comment_url = f"{url}/comments"
        comment_data = {
            "body": "✅ Event processed and recorded. Closing this issue."
        }
        
        logger.debug(f"Posting comment to {comment_url}")
        async with session.post(comment_url, headers=self.base_headers, json=comment_data) as response:
            if response.status != 201:
                logger.error(f"Failed to add comment to issue {issue_number}. Status: {response.status}")
                logger.debug(f"Response: {await response.text()}")
                return False

        # Close issue
        logger.debug(f"Closing issue at {url}")
        close_data = {"state": "closed"}
        async with session.patch(url, headers=self.base_headers, json=close_data) as response:
            success = response.status == 200
            if success:
                logger.success(f"Successfully closed issue #{issue_number}")
            else:
                logger.error(f"Failed to close issue {issue_number}. Status: {response.status}")
                logger.debug(f"Response: {await response.text()}")
            return success

    def update_registry(self):
        """Update the centralized registry with any modified papers."""
        logger.info("Updating centralized registry")
        registry = {}
        registry_file = Path("data/papers.yaml")
        
        # Load existing registry if it exists
        if registry_file.exists():
            logger.debug(f"Loading existing registry from {registry_file}")
            with registry_file.open('r') as f:
                registry = yaml.safe_load(f) or {}
        
        # Only update entries for modified papers
        modified_papers = {
            path.parent.name for path in map(Path, self.modified_files)
            if "metadata.json" in str(path)
        }
        logger.info(f"Found {len(modified_papers)} modified papers to update in registry")
        logger.debug(f"Modified papers: {modified_papers}")
        
        for arxiv_id in modified_papers:
            metadata_file = self.papers_dir / arxiv_id / "metadata.json"
            if metadata_file.exists():
                logger.debug(f"Updating registry entry for {arxiv_id}")
                with metadata_file.open('r') as f:
                    registry[arxiv_id] = json.load(f)
        
        # Only save and track if we made changes
        if modified_papers:
            logger.info("Saving updated registry")
            with registry_file.open('w') as f:
                yaml.safe_dump(registry, f, sort_keys=True, indent=2, allow_unicode=True)
            self.modified_files.add(str(registry_file))
            logger.info(f"Added {registry_file} to modified files")
        else:
            logger.info("No changes to registry needed")

    async def process_all_issues(self):
        """Process all open issues."""
        logger.info("Starting to process all open issues")
        
        async with aiohttp.ClientSession() as session:
            issues = await self.get_open_issues(session)
            logger.info(f"Processing {len(issues)} issues")
            
            for issue in issues:
                labels = [label["name"] for label in issue["labels"]]
                logger.info(f"Processing issue #{issue['number']}: {issue['title']} (Labels: {labels})")
                success = False
                
                if "reading-session" in labels:
                    success = self.process_reading_session(issue)
                elif "paper" in labels:
                    success = self.process_new_paper(issue)
                
                if success:
                    if not await self.close_issue(session, issue["number"]):
                        logger.error(f"Failed to close issue {issue['number']}")

            # Update centralized registry if we have any changes
            if self.modified_files:
                logger.info(f"Found {len(self.modified_files)} modified files to commit")
                logger.debug(f"Modified files: {self.modified_files}")
                self.update_registry()
                # Commit all modified files
                logger.info("Committing changes")
                commit_and_push(list(self.modified_files))
            else:
                logger.info("No files were modified during processing")

def main():
    """Main entry point for processing paper events."""
    logger.info("=== Starting paper event processing ===")
    processor = EventProcessor()
    asyncio.run(processor.process_all_issues())
    logger.info("=== Finished paper event processing ===")

if __name__ == "__main__":
    main()
