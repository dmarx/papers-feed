#!/usr/bin/env python3
# github_repo_mirror.py

"""
Utility to copy issues, comments, labels and reactions from one GitHub repository to another,
or to clean labels from all issues in a repository.
"""

import os
import sys
from typing import Dict, List, Optional

import fire
from github import Github, GithubException
from github.Issue import Issue
from github.Label import Label
from github.Repository import Repository
from loguru import logger

# Set up logging
logger.remove()
logger.add(sys.stderr, format="{time} {level} {message}", level="INFO")


class GitHubRepoMirror:
    """Class to mirror issues and related data between GitHub repositories."""
    
    def __init__(
        self, 
        token: str,
        source_repo: str = "dmarx/papers-feed",
        target_repo: str = "dmarx/papers-feed-dev",
    ):
        """
        Initialize with GitHub credentials and repository info.
        
        Args:
            token: GitHub personal access token
            source_repo: Source repository in format "owner/repo"
            target_repo: Target repository in format "owner/repo"
        """
        self.source_repo_name = source_repo
        self.target_repo_name = target_repo
        
        # Initialize GitHub client
        self.github = Github(
            token, 
            per_page=100,
            retry=3
        )
        
        # Get repository objects
        self.source_repo = self.github.get_repo(source_repo)
        self.target_repo = self.github.get_repo(target_repo)
        
        # Label cache to avoid creating duplicate labels
        self.label_cache: Dict[str, Label] = {}

    def _create_label_if_not_exists(self, label_name: str, label_color: str, 
                                    label_description: str = "") -> Label:
        """
        Create a label in the target repo if it doesn't already exist.
        
        Args:
            label_name: Name of the label
            label_color: Color of the label (hex code without #)
            label_description: Description of the label
            
        Returns:
            The label object
        """
        # Check cache first
        if label_name in self.label_cache:
            return self.label_cache[label_name]
        
        # Try to get existing label
        try:
            label = self.target_repo.get_label(label_name)
            self.label_cache[label_name] = label
            return label
        except GithubException:
            # Label doesn't exist, create it
            logger.info(f"Creating label '{label_name}' in target repository")
            label = self.target_repo.create_label(
                name=label_name,
                color=label_color,
                description=label_description
            )
            self.label_cache[label_name] = label
            return label

    def _copy_reactions(self, source_obj, target_obj):
        """
        Copy reactions from source to target object.
        
        Args:
            source_obj: Source object with reactions (Issue or IssueComment)
            target_obj: Target object to add reactions to
        """
        # Get all reactions from source
        try:
            reactions = source_obj.get_reactions()
            
            # Add each reaction type to target
            reaction_counts = {}
            for reaction in reactions:
                reaction_type = reaction.content
                reaction_counts[reaction_type] = reaction_counts.get(reaction_type, 0) + 1
            
            # Create reactions on target
            for reaction_type, count in reaction_counts.items():
                logger.debug(f"Adding {count} '{reaction_type}' reactions")
                for _ in range(count):
                    try:
                        target_obj.create_reaction(reaction_type)
                    except GithubException as e:
                        # Creating the same reaction twice will fail
                        if e.status == 422:
                            logger.debug(f"Duplicate reaction '{reaction_type}' - skipping")
                        else:
                            raise
        except GithubException as e:
            logger.warning(f"Could not copy reactions: {str(e)}")

    def clear_all_issue_labels(self, repo_name: str = None):
        """
        Remove all labels from all issues in a repository.
        
        Args:
            repo_name: Repository to clean (defaults to target repo)
        """
        repo = self.target_repo
        if repo_name:
            repo = self.github.get_repo(repo_name)
            
        logger.info(f"Removing all labels from all issues in {repo.full_name}")
        
        # Get all issues (open and closed)
        issues = repo.get_issues(state="all")
        
        # Track progress
        count = 0
        processed = 0
        
        # Process each issue
        for issue in issues:
            processed += 1
            
            # Skip issues with no labels
            if not list(issue.labels):
                continue
            
            logger.info(f"Clearing labels from issue #{issue.number}: {issue.title}")
            
            # Remove all labels
            issue.set_labels()  # Empty list clears all labels
            count += 1
            
            # Log progress occasionally
            if processed % 10 == 0:
                logger.info(f"Processed {processed} issues so far")
        
        logger.info(f"Completed! Removed labels from {count} issues out of {processed} total issues.")
        return count

    def copy_labels(self) -> int:
        """
        Copy all labels from source repository to target repository.
        
        Returns:
            Number of labels created
        """
        logger.info(f"Copying labels from {self.source_repo_name} to {self.target_repo_name}")
        
        created = 0
        
        # Get existing target labels
        target_labels = {label.name: label for label in self.target_repo.get_labels()}
        
        # Copy labels from source to target
        for source_label in self.source_repo.get_labels():
            if source_label.name in target_labels:
                logger.debug(f"Label already exists: {source_label.name}")
                # Cache the label for later use
                self.label_cache[source_label.name] = target_labels[source_label.name]
            else:
                # Create new label
                logger.info(f"Creating new label: {source_label.name}")
                new_label = self.target_repo.create_label(
                    name=source_label.name,
                    color=source_label.color,
                    description=source_label.description or ""
                )
                # Cache the label for later use
                self.label_cache[source_label.name] = new_label
                created += 1
        
        logger.info(f"Label copy completed: {created} created")
        return created

    def copy_issue(self, issue_number: int) -> Issue:
        """
        Copy a single issue and all its comments from source to target repository.
        
        Args:
            issue_number: The issue number in the source repository
            
        Returns:
            The newly created issue in the target repository
        """
        logger.info(f"Copying issue #{issue_number} from {self.source_repo_name}")
        
        # Get source issue
        source_issue = self.source_repo.get_issue(issue_number)
        
        # Create issue in target repo - exact copy of title and body
        target_issue = self.target_repo.create_issue(
            title=source_issue.title,
            body=source_issue.body
        )
        logger.info(f"Created issue #{target_issue.number} at target from source #{source_issue.number}")
        
        # Copy labels
        for label in source_issue.labels:
            target_label = self._create_label_if_not_exists(
                label_name=label.name,
                label_color=label.color,
                label_description=label.description or ""
            )
            target_issue.add_to_labels(target_label)
            
        # Copy state (open/closed)
        if source_issue.state == "closed":
            target_issue.edit(state="closed")
            
        # Copy comments - exact copies without modifications
        for comment in source_issue.get_comments():
            target_comment = target_issue.create_comment(comment.body)
            
            # Copy reactions from comment
            self._copy_reactions(comment, target_comment)
            
        # Copy reactions to the issue itself
        self._copy_reactions(source_issue, target_issue)
        
        return target_issue

    def copy_all_issues(self, issue_range_start: int = None, issue_range_end: int = None) -> List[Issue]:
        """
        Copy all issues from source to target repository, optionally within a specific issue number range.
        
        Args:
            issue_range_start: Optional starting issue number to copy (inclusive)
            issue_range_end: Optional ending issue number to copy (inclusive)
            
        Returns:
            List of created issues in the target repository
        """
        created_issues = []
        
        # First, make sure all labels exist in the target repo
        self.copy_labels()
        
        # Get all issues from source repo with filters, sorted by creation date ascending
        source_issues = self.source_repo.get_issues(state="all", sort="created", direction="asc")
        logger.info(f"Fetching issues from source repository (sorted by creation date)...")
        
        # Process each issue
        for source_issue in source_issues:
            # Skip issues outside the specified range if ranges are provided
            if issue_range_start is not None and source_issue.number < issue_range_start:
                logger.debug(f"Skipping issue #{source_issue.number}: Below range start.")
                continue
                
            if issue_range_end is not None and source_issue.number > issue_range_end:
                logger.info(f"Reached end of specified issue range (#{issue_range_end}), exiting.")
                break
                
            if source_issue.pull_request is not None:
                logger.info(f"Skipping issue #{source_issue.number}: PR.")
                continue
                
            if not source_issue.body:
                logger.info(f"Skipping issue #{source_issue.number}: empty issue body.")
                continue
                
            created_issue = self.copy_issue(source_issue.number)
            created_issues.append(created_issue)
            
            # Log progress occasionally
            if len(created_issues) % 5 == 0:
                logger.info(f"Copied {len(created_issues)} issues so far")
                    
        logger.info(f"Created {len(created_issues)} issues in the target repository")
        return created_issues


def mirror_repository(
    clear_target_labels: bool = True,
    token: str = None,
    source_repo: str = "dmarx/papers-feed",
    target_repo: str = "dmarx/papers-feed-dev",
    issue_range_start: int = 1000,
    issue_range_end: int = 1075,
):
    """
    Mirror issues, comments, labels and reactions from source to target repository.
    Can also clear all labels from issues in the target repository.
    
    Args:
        clear_target_labels: If True, remove all labels from all issues in target repository first
        token: GitHub token (or use DEV_REPO_TOKEN environment variable)
        source_repo: Source repository in format "owner/repo"
        target_repo: Target repository in format "owner/repo"
        issue_range_start: Optional starting issue number to copy (inclusive)
        issue_range_end: Optional ending issue number to copy (inclusive)
    """
    # Use provided token or get from environment
    token = token or os.environ.get("DEV_REPO_TOKEN")
    
    if not token:
        logger.error("GitHub token not provided. Use --token or set DEV_REPO_TOKEN environment variable.")
        sys.exit(1)
        
    if source_repo == target_repo:
        logger.error("Source and target repositories must be different.")
        sys.exit(1)
        
    # Create and run the mirroring tool
    mirror = GitHubRepoMirror(
        token=token,
        source_repo=source_repo,
        target_repo=target_repo
    )
    
    # Clear all labels from issues in target repo if requested
    if clear_target_labels:
        logger.info("Clearing all labels from issues in target repository")
        mirror.clear_all_issue_labels()
    
    # Copy all issues from source to target, with optional range limits
    range_info = ""
    if issue_range_start is not None or issue_range_end is not None:
        range_info = f" (issues {issue_range_start or 'start'} to {issue_range_end or 'end'})"
    
    logger.info(f"Mirroring from {source_repo} to {target_repo}{range_info}")
    mirror.copy_all_issues(issue_range_start, issue_range_end)
    logger.info("Repository mirroring completed.")


def clear_issue_labels(
    token: str = None,
    repo_name: str = "dmarx/papers-feed-dev"
):
    """
    Simple function to clear all labels from all issues in a repository.
    
    Args:
        token: GitHub token (or use DEV_REPO_TOKEN environment variable)
        repo_name: Repository in format "owner/repo"
    """
    # Use provided token or get from environment
    token = token or os.environ.get("DEV_REPO_TOKEN")
    
    if not token:
        logger.error("GitHub token not provided. Use --token or set DEV_REPO_TOKEN environment variable.")
        sys.exit(1)
        
    # Create the tool and clear labels
    mirror = GitHubRepoMirror(token=token)
    mirror.clear_all_issue_labels(repo_name)


if __name__ == "__main__":
    fire.Fire({
        'mirror': mirror_repository,
        'clear_labels': clear_issue_labels
    })
