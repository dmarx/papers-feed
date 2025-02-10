# scripts/process_task.py
from dataclasses import dataclass
import json
from pathlib import Path

from duckduckgo_search import DDGS
import fire
#from gh_store.core.access import AccessControl
from loguru import logger

ddg = DDGS()

#access_control = AccessControl(self.repo)

# #TODO: access validation as gh-store CLI capability
# issue = self.repo.get_issue(issue_number)
# if not self.access_control.validate_issue_creator(issue):

def with_prompt(
  target: str|Path,
  prompt: str="summarize the following:\n\n {content}"
):
  with Path(target).open() as f:
    content = f.read()
  msg = prompt.format(content=content) # should probably chunk somehow and iterate over chunks
  logger.info(msg)
  response = ddg.chat(msg)
  return response
  

# ... should just use locals...
OPERATORS={
    "ddg.chat": ddg.chat,
    "with_prompt": with_prompt,
}

@dataclass
class TaskConfig:
    operator: str
    kwargs: dict


def main(config: dict):
    config = TaskConfig(**config)
    logger.info(config)
    op = OPERATORS[config.operator]
    result = op(**config.kwargs)
    logger.info(result)
    return result

fire.Fire(main)
