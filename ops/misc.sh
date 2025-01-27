#!/bin/bash

python \
  frontend/scripts/convert_data.py \
  --yaml-path data/papers/papers.yml \
  --json-path data/papers/papers-archive.json
