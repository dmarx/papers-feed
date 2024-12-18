#!/bin/bash
# Move Python scripts from /scripts to /src/scripts

# Create src directory if it doesn't exist
mkdir -p src/scripts

# Move all python files from scripts to src/scripts
mv scripts/*.py src/scripts/

# Remove scripts directory if empty
rmdir scripts 2>/dev/null || true
