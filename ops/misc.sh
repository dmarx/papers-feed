#!/bin/bash

# Create temporary Python script
cat << 'EOF' > /tmp/cleanup.py
from pathlib import Path

def move_grobid_files(base_path: str = "data/papers"):
    base_path = Path(base_path)
    
    # Find all grobid files that are in the wrong place
    for file in base_path.rglob("*_grobid.*"):
        if "features" in str(file.parent):  # Skip if already in a features directory
            continue
            
        # Determine the paper ID from the directory name
        paper_id = file.parent.name
        
        # Determine feature type and extension
        if file.name.endswith("_grobid.md"):
            feature_type = "markdown-grobid"
            new_ext = ".md"
        elif file.name.endswith("_grobid.tei.xml"):
            feature_type = "tei-xml-grobid"
            new_ext = ".xml"
        else:
            continue
        
        # Create feature directory
        feature_dir = file.parent / "features" / feature_type
        feature_dir.mkdir(parents=True, exist_ok=True)
        
        # New path for the file
        new_path = feature_dir / f"{paper_id}{new_ext}"
        
        print(f"Moving {file} to {new_path}")
        
        if new_path.exists():
            print(f"  Target exists, deleting source file")
            file.unlink()
        else:
            file.rename(new_path)

if __name__ == "__main__":
    move_grobid_files()
EOF

# Install Python if not present and run the script
if ! command -v python3 &> /dev/null; then
    apt-get update && apt-get install -y python3
fi

python3 /tmp/cleanup.py
rm /tmp/cleanup.py
