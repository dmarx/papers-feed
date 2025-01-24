# scripts/toggle_issues.py
import os
import requests
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
reopen_all_matching = os.environ["REOPEN_ALL_MATCHING"].lower() == "true"

# Setup for direct API calls that will trigger webhooks
api_headers = {
    "Accept": "application/vnd.github.v3+json",
    "Authorization": f"token {os.environ['GITHUB_TOKEN']}",
    # This header is crucial - it tells GitHub to trigger webhooks
    "X-GitHub-Api-Version": "2022-11-28"
}
api_base_url = f"https://api.github.com/repos/{os.environ['REPO']}/issues"

def reopen_issue_with_webhook(issue_number: int) -> None:
    """Reopen an issue using the REST API to ensure webhook triggering."""
    response = requests.patch(
        f"{api_base_url}/{issue_number}",
        headers=api_headers,
        json={"state": "open"}
    )
    response.raise_for_status()

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

    if perform_reopen:
        if reopen_all_matching:
            # Get all closed issues with the specified label
            logger.info(f"Finding all closed issues with label: {label}")
            closed_issues = list(repo.get_issues(state="closed", labels=[label]))
            
            if not closed_issues:
                logger.warning("No closed issues found with specified label")
            else:
                logger.info(f"Found {len(closed_issues)} issues to reopen")
                reopen_task = progress.add_task(
                    "[green]Reopening all matching issues...", 
                    total=len(closed_issues)
                )
                
                for issue in closed_issues:
                    logger.info(f"Reopening issue #{issue.number}")
                    reopen_issue_with_webhook(issue.number)
                    progress.update(reopen_task, advance=1)
        
        elif closed_issue_numbers:
            # Reopen only issues we just closed
            logger.info("Reopening previously closed issues")
            reopen_task = progress.add_task(
                "[green]Reopening issues from this run...", 
                total=len(closed_issue_numbers)
            )
            
            for number in closed_issue_numbers:
                logger.info(f"Reopening issue #{number}")
                reopen_issue_with_webhook(number)
                progress.update(reopen_task, advance=1)
        else:
            logger.info("No issues to reopen")
    else:
        logger.info("Skipping reopen step")

logger.info("Issue toggle process completed")
