# scripts/toggle_issues.py
import os

from github import Github
from loguru import logger
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeRemainingColumn

logger.info("Starting issue toggle process")

# Initialize GitHub client
g = Github(os.environ["GITHUB_TOKEN"])
repo = g.get_repo(os.environ["REPO"])
label = os.environ["LABEL"]
perform_close = os.environ["PERFORM_CLOSE"].lower() == "true"
perform_reopen = os.environ["PERFORM_REOPEN"].lower() == "true"

# Track which issues we close for potential reopening
closed_issue_numbers = []

# Create a progress instance with custom columns
progress = Progress(
    SpinnerColumn(),
    TextColumn("[bold blue]{task.description}"),
    BarColumn(),
    TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
    TimeRemainingColumn(),
    expand=True
)

with progress:
    if perform_close:
        # Get all open issues with the specified label
        logger.info(f"Finding open issues with label: {label}")
        open_issues = list(repo.get_issues(state="open", labels=[label]))

        if not open_issues:
            logger.warning("No open issues found with specified label")
        else:
            # Close all matching issues while recording their numbers
            logger.info(f"Found {len(open_issues)} issues to close")
            close_task = progress.add_task(
                "[red]Closing issues...", 
                total=len(open_issues)
            )
            
            for issue in open_issues:
                logger.info(f"Closing issue #{issue.number}")
                issue.edit(state="closed")
                closed_issue_numbers.append(issue.number)
                progress.update(close_task, advance=1)
    else:
        logger.info("Skipping close step")

    if perform_reopen and closed_issue_numbers:
        # Reopen all previously closed issues
        logger.info("Reopening closed issues")
        reopen_task = progress.add_task(
            "[green]Reopening issues...", 
            total=len(closed_issue_numbers)
        )
        
        for number in closed_issue_numbers:
            issue = repo.get_issue(number)
            logger.info(f"Reopening issue #{number}")
            issue.edit(state="open")
            progress.update(reopen_task, advance=1)
    elif perform_reopen:
        logger.info("No issues to reopen")
    else:
        logger.info("Skipping reopen step")

logger.info("Issue toggle process completed")
