# arxiv-archive

System which monitors what I'm reading via a browser extension. 

# How it works

1. When I visit an arxiv URL, the browser extension creates an issue on this repo
2. Issues are processed by github actions workflows to log metadata about what I'm reading
3. Workflows additionally download the papers in both PDF and raw source tex, and attempts to generate a markdown version from the source files

## WIP

* The browser extension has some rudimentary reading time estimation, but the thresholds are poorly calibrated and the downstream processing is broken (but the relevant data is still being recorded in issues, so will be avialable to be processed correctly when I fix it)
* "Why am I reading this" inference
  * Track source pages of hyperlinks that led me to arxiv to track value of different sources of reseach signal
  * Track overlapping reading sessions that cross-cite to identify when I'm engaging in a "citation rabbit hole"
* Analytics on the markdown content
  * Extraction of key contributions and recommendations (see also https://github.com/dmarx/anthology-of-the-sota/)

## Why is this so janky?

I'm making Claude write basically all of the code because... I dunno, I'm a masochist or something. 
