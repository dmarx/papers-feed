#!/usr/bin/env python3
# github_repo_mirror.py

"""
Utility to copy issues, comments, labels and reactions from one GitHub repository to another.
Useful for creating test environments that mirror production repositories.
"""

import os
import sys
import time
from typing import Dict, List, Set, Tuple

import fire
from github import Github, GithubException, RateLimitExceededException
from github.Issue import Issue
from github.IssueComment import IssueComment
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
        source_repo: str,
        target_repo: str,
        #3wait_on_rate_limit: bool = True
    ):
        """
        Initialize with GitHub credentials and repository info.
        
        Args:
            token: GitHub personal access token
            source_repo: Source repository in format "owner/repo"
            target_repo: Target repository in format "owner/repo"
            wait_on_rate_limit: Whether to wait when rate limits are hit
        """
        self.source_repo_name = source_repo
        self.target_repo_name = target_repo
        #self.wait_on_rate_limit = wait_on_rate_limit
        
        # Initialize GitHub client
        self.github = Github(
            token, 
            per_page=100,
            retry=3,
            # Only wait on rate limit if explicitly requested
            # This prevents hanging indefinitely by default
            #wait_for_rate_limit_reset=wait_on_rate_limit
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

    def _handle_rate_limit(self):
        """Handle GitHub API rate limiting by waiting if configured to do so."""
        if not self.wait_on_rate_limit:
            logger.warning("Rate limit hit, but waiting is disabled. Exiting.")
            sys.exit(1)
            
        rate_limit = self.github.get_rate_limit()
        reset_timestamp = rate_limit.core.reset.timestamp()
        sleep_time = reset_timestamp - time.time() + 10  # Add 10 seconds buffer
        
        if sleep_time > 0:
            logger.warning(f"Rate limit hit. Waiting {sleep_time:.0f} seconds for reset...")
            time.sleep(sleep_time)
            logger.info("Continuing after rate limit reset")

    def _copy_reactions(self, source_obj, target_obj):
        """
        Copy reactions from source to target object.
        
        Args:
            source_obj: Source object with reactions (Issue or IssueComment)
            target_obj: Target object to add reactions to
        
        Note: 
            Due to API limitations, this can't properly reproduce the original users.
            All reactions will appear to come from the authenticated user.
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

    def copy_labels(self, update_existing: bool = False) -> Tuple[int, int]:
        """
        Copy all labels from source repository to target repository.
        
        Args:
            update_existing: If True, update existing labels with source properties
            
        Returns:
            Tuple of (created_count, updated_count)
        """
        logger.info(f"Copying labels from {self.source_repo_name} to {self.target_repo_name}")
        
        created = 0
        updated = 0
        
        try:
            # Get existing target labels
            target_labels = {label.name: label for label in self.target_repo.get_labels()}
            
            # Copy labels from source to target
            for source_label in self.source_repo.get_labels():
                if source_label.name in target_labels:
                    if update_existing:
                        # Update existing label
                        logger.info(f"Updating existing label: {source_label.name}")
                        target_labels[source_label.name].edit(
                            name=source_label.name,
                            color=source_label.color,
                            description=source_label.description or ""
                        )
                        updated += 1
                    else:
                        logger.debug(f"Label already exists: {source_label.name}")
                else:
                    # Create new label
                    logger.info(f"Creating new label: {source_label.name}")
                    self.target_repo.create_label(
                        name=source_label.name,
                        color=source_label.color,
                        description=source_label.description or ""
                    )
                    created += 1
                    
                # Cache the label for later use
                self.label_cache[source_label.name] = source_label
                
        except RateLimitExceededException:
            self._handle_rate_limit()
            # Resume where we left off
            return self.copy_labels(update_existing)
        
        logger.info(f"Label copy completed: {created} created, {updated} updated")
        return created, updated

    def copy_issue(self, issue_number: int, copy_reactions: bool = True) -> Issue:
        """
        Copy a single issue and all its comments from source to target repository.
        
        Args:
            issue_number: The issue number in the source repository
            copy_reactions: Whether to copy reactions as well
            
        Returns:
            The newly created issue in the target repository
        """
        logger.info(f"Copying issue #{issue_number} from {self.source_repo_name}")
        
        try:
            # Get source issue
            source_issue = self.source_repo.get_issue(issue_number)
            
            # Prepare issue properties
            title = source_issue.title
            body = f"{source_issue.body}\n\n---\n*Copied from {self.source_repo_name}#{issue_number}*"
            
            # Create issue in target repo
            target_issue = self.target_repo.create_issue(title=title, body=body)
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
                
            # Copy comments
            for comment in source_issue.get_comments():
                comment_body = f"{comment.body}\n\n---\n*Original comment by @{comment.user.login}*"
                target_comment = target_issue.create_comment(comment_body)
                
                # Copy reactions if requested
                if copy_reactions:
                    self._copy_reactions(comment, target_comment)
                    
            # Copy reactions to the issue itself
            if copy_reactions:
                self._copy_reactions(source_issue, target_issue)
                
            return target_issue
            
        except RateLimitExceededException:
            self._handle_rate_limit()
            # Try again
            return self.copy_issue(issue_number, copy_reactions)

    def copy_issues(
        self, 
        issue_numbers: List[int] | None = None,
        state: str = "all",
        max_issues: int | None = None,
        copy_reactions: bool = True,
        min_issue_number: int | None = None,
        max_issue_number: int | None = None
    ) -> List[Issue]:
        """
        Copy multiple issues from source to target repository.
        
        Args:
            issue_numbers: Specific issue numbers to copy, or None for all
            state: Filter by issue state ("open", "closed", or "all")
            max_issues: Maximum number of issues to copy
            copy_reactions: Whether to copy reactions
            min_issue_number: Only copy issues with number >= this value
            max_issue_number: Only copy issues with number <= this value
            
        Returns:
            List of created issues in the target repository
        """
        created_issues = []
        
        # First, make sure all labels exist in the target repo
        self.copy_labels()
        
        try:
            if issue_numbers:
                # Copy specific issues
                for issue_number in issue_numbers:
                    created_issue = self.copy_issue(issue_number, copy_reactions)
                    created_issues.append(created_issue)
                    
                    if max_issues and len(created_issues) >= max_issues:
                        break
            else:
                # Get all issues from source repo with filters
                source_issues = self.source_repo.get_issues(state=state)
                count = 0
                
                for source_issue in source_issues:
                    # Apply number range filters if provided
                    if min_issue_number and source_issue.number < min_issue_number:
                        continue
                    if max_issue_number and source_issue.number > max_issue_number:
                        continue
                        
                    created_issue = self.copy_issue(source_issue.number, copy_reactions)
                    created_issues.append(created_issue)
                    count += 1
                    
                    if max_issues and count >= max_issues:
                        logger.info(f"Reached maximum issues limit of {max_issues}")
                        break
                        
        except RateLimitExceededException:
            self._handle_rate_limit()
            # Continue where we left off, but don't duplicate what we've already copied
            if issue_numbers:
                remaining = [num for num in issue_numbers if num not in [i.number for i in created_issues]]
                remaining_issues = self.copy_issues(
                    issue_numbers=remaining,
                    state=state,
                    max_issues=max_issues - len(created_issues) if max_issues else None,
                    copy_reactions=copy_reactions
                )
                created_issues.extend(remaining_issues)
            else:
                # If we weren't copying specific issues, just report what we've done so far
                logger.info(f"Partially completed: copied {len(created_issues)} issues before rate limit hit")
                
        logger.info(f"Created {len(created_issues)} issues in the target repository")
        return created_issues


def mirror_repository(
    source_repo: str = "dmarx/papers-feed",
    target_repo: str = "dmarx/papers-feed-dev",
    token: str | None = None,
    issue_numbers: List[int] | None = None,
    state: str = "all",
    max_issues: int | None = None,
    copy_reactions: bool = True,
    min_issue_number: int | None = None,
    max_issue_number: int | None = None,
    #wait_on_rate_limit: bool = True
):
    """
    Mirror issues, comments, labels and reactions from source to target repository.
    
    Args:
        source_repo: Source repository in format "owner/repo"
        target_repo: Target repository in format "owner/repo"
        token: GitHub token (or use GITHUB_TOKEN environment variable)
        issue_numbers: Specific issue numbers to copy, or None for all
        state: Filter by issue state ("open", "closed", or "all")
        max_issues: Maximum number of issues to copy
        copy_reactions: Whether to copy reactions
        min_issue_number: Only copy issues with number >= this value
        max_issue_number: Only copy issues with number <= this value
        wait_on_rate_limit: Whether to wait when rate limits are hit
    """
    # Use provided token or get from environment
    token = token or os.environ.get("DEV_REPO_TOKEN") # or os.environ.get("GITHUB_TOKEN")
    
    if not token:
        logger.error("GitHub token not provided. Use --token or set GITHUB_TOKEN or DEV_REPO_TOKEN environment variable.")
        sys.exit(1)
        
    if source_repo == target_repo:
        logger.error("Source and target repositories must be different.")
        sys.exit(1)
        
    logger.info(f"Mirroring from {source_repo} to {target_repo}")
    
    if issue_numbers:
        logger.info(f"Will copy specific issues: {issue_numbers}")
    else:
        issue_range = ""
        if min_issue_number:
            issue_range += f" from #{min_issue_number}"
        if max_issue_number:
            issue_range += f" up to #{max_issue_number}"
        
        logger.info(f"Will copy {state} issues{issue_range}")
        if max_issues:
            logger.info(f"Limited to {max_issues} issues maximum")
    
    # Create and run the mirroring tool
    mirror = GitHubRepoMirror(
        token=token,
        source_repo=source_repo,
        target_repo=target_repo,
        #wait_on_rate_limit=wait_on_rate_limit
    )
    
    # Copy all labels first
    mirror.copy_labels()
    
    # Copy issues with their comments, labels, and reactions
    created_issues = mirror.copy_issues(
        issue_numbers=issue_numbers,
        state=state,
        max_issues=max_issues,
        copy_reactions=copy_reactions,
        min_issue_number=min_issue_number,
        max_issue_number=max_issue_number
    )
    
    logger.info(f"Repository mirroring completed. Created {len(created_issues)} issues.")
    
    
if __name__ == "__main__":
    fire.Fire(mirror_repository)
