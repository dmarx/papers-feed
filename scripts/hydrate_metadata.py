# this could probably be rolled into enrichment processing
#!/usr/bin/env python
# fetch_arxiv_metadata.py
"""
Fetches metadata for arXiv papers identified by issue labels and stores it using gh-store.
"""

import json
import sys
import os
import re
from typing import Dict, List, Optional, Any
import fire
from loguru import logger
import arxiv
import requests


from gh_store.core.store import GitHubStore
from gh_store.core.types import get_object_id_from_labels, StoredObject


def is_valid_arxiv_id(arxiv_id: str) -> bool:
    """Validate arXiv ID format."""
    return bool(re.match(r'\d{4}\.\d{4,5}(v\d+)?|\w+\/\d{7}(v\d+)?', arxiv_id))

# this doesn't need to be wrapped in a class.


def extract_arxiv_id_from_object_id(object_id: str) -> str:
    """Extract the arXiv ID from a paper ID with various prefixing schemes."""
    prefix = 'arxiv'
    
    # Case 1: Format is "prefix:id"
    if object_id.startswith(f"{prefix}:"):
        return object_id[len(prefix)+1:]
    
    # Case 2: Format is "prefix.id"
    if object_id.startswith(f"{prefix}."):
        return object_id[len(prefix)+1:]
    
    # Case 3: Format is "prefix:prefix:id"
    if object_id.startswith(f"{prefix}:{prefix}:"):
        return object_id[len(prefix)*2+2:]
    
    # Case 4: Format is "prefix.prefix.id"
    if object_id.startswith(f"{prefix}.{prefix}."):
        return object_id[len(prefix)*2+2:]
    
    # Case 5: If none of the above, return the original ID
    return object_id

def fetch_arxiv_metadata(arxiv_id: str) -> Dict[str, Any]:
    """Fetch metadata from arXiv API for a given ID using the arxiv client."""
    logger.info(f"Fetching metadata for arXiv ID: {arxiv_id}")
    
    client = arxiv.Client()
    search = arxiv.Search(id_list=[arxiv_id])
    paper = next(client.results(search))
    if not paper:
        raise ValueError(f"No paper found with arXiv ID: {arxiv_id}")
    
    # Convert arxiv.Result object to dictionary
    metadata = {
        'id': paper.entry_id,
        'title': paper.title,
        'summary': paper.summary,
        'authors': [author.name for author in paper.authors],
        'published': paper.published.isoformat() if paper.published else None,
        'updated': paper.updated.isoformat() if paper.updated else None,
        'doi': paper.doi,
        'categories': paper.categories,
        #'links': [{'href': link.href, 'type': link.type} for link in paper.links],
        'comment': paper.comment,
        'journal_ref': paper.journal_ref,
        'primary_category': paper.primary_category,
        'pdf_url': paper.pdf_url
    }
    
    logger.info(f"Successfully fetched metadata for arXiv ID: {arxiv_id}")
    logger.info(metadata)
    return metadata

def main(issue: int, token:str, repo:str):
    store = GitHubStore(token=token, repo=repo)
    obj = store.issue_handler.get_object_by_number(issue)
    object_id = obj.meta.object_id
    if not object_id.startswith("paper:"):
        logger.info("Not a paper object, exiting.")
        sys.exit(0)
    object_id = object_id[len('paper:'):]
    if object_id.startswith('arxiv'):
        arxiv_id = extract_arxiv_id_from_object_id(object_id)
    elif is_valid_arxiv_id(object_id):
        arxiv_id = object_id
    else:
        raise TypeError(f"Unable to identify arxiv_id from object_id: {object_id}")

    arxiv_meta = fetch_arxiv_metadata(arxiv_id)
    

if __name__ == "__main__":
    fire.Fire(main)
