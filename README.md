# Arxiv Papers Feed

System which monitors what I'm reading via a browser extension and publishes a feed: https://dmarx.github.io/papers-feed/

# How it works

1. When I interact with an arxiv URL, the browser extension logs the interaction by creating a github issue on this repo
2. Issues are processed by github actions workflows to log metadata and compute analytics about what I'm reading
3. Aggregated results are injected into a simple webpage template which is hosted via github pages

# How to set this up to monitor your own reading

1. Create a new repository from this template: https://github.com/dmarx/papers-feed-template
2. Configure repository settings
  * [Configure github pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-from-a-branch) to deploy from the `gh-pages` branch
  * Give actions write permissions on your repo
5. [Install the browser extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) located in `papers-feed-src/extension`
6. [Create a a github PAT](https://github.blog/security/application-security/introducing-fine-grained-personal-access-tokens-for-github/#creating-personal-access-tokens) with permission to create issues on your papers-feed repo
7. Register the PAT in the browser extension's options
8. visit an arxiv /abs/ or /pdf/ page to test that everything is set up correctly. Shortly after visiting:
  * an issue with the label "paper" should be created
  * opening that issue should trigger the process-events.yml workflow, which in turn should trigger but build-and-deploy.yml workflow
  * after a few minutes, the frontend should be available via gh-pages

# Acknowledgements

* Thank you to anthropic for making a decent LLM (I made claude write nearly all of this)
* Thank you also to https://github.com/utterance/utterances, which inspired how this project (ab)uses github issues as a database
