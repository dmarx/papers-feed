#!/bin/bash
# rename_to_plugins.sh
#
# This script renames the "source integration" system to a "paper plugin" system
# in the extension codebase.
#
# Usage: ./rename_to_plugins.sh /path/to/extension/directory

set -e

if [ -z "$1" ]; then
  echo "Usage: ./rename_to_plugins.sh /path/to/extension/directory"
  exit 1
fi

EXT_DIR="$1"
cd "$EXT_DIR"

echo "Starting renaming process in $EXT_DIR"

# Create backup
BACKUP_DIR="../extension_backup_$(date +%Y%m%d_%H%M%S)"
echo "Creating backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r ./* "$BACKUP_DIR/"

echo "Backing up complete"

# 1. Rename directories
echo "Renaming directories..."
if [ -d "source-integration" ]; then
  mkdir -p "paper-plugins"
  cp -r "source-integration/"* "paper-plugins/"
  
  # We'll keep the original directory until we've updated all references
  echo "Created paper-plugins directory and copied files"
fi

# 2. Rename files within the new directory
echo "Renaming files within paper-plugins directory..."
if [ -d "paper-plugins" ]; then
  # Rename files with "source" in their name
  find "paper-plugins" -name "*source*" -type f | while read file; do
    newname=$(echo "$file" | sed 's/source/plugin/g')
    echo "  $file -> $newname"
    mv "$file" "$newname"
  done
  
  # Rename integration files
  find "paper-plugins" -name "*integration*" -type f | while read file; do
    newname=$(echo "$file" | sed 's/integration/plugin/g')
    echo "  $file -> $newname"
    mv "$file" "$newname"
  done
fi

# 3. Update file contents for renamed types and classes
echo "Updating file contents..."

# Class and interface names
replacements=(
  "SourceIntegration:PaperPlugin"
  "BaseSourceIntegration:BasePaperPlugin"
  "SourceIntegrationManager:PluginManager"
  "SourceManager:PluginManager"
  "sourceManager:pluginManager"
  "SourceIntegration\[\]:PaperPlugin\[\]"
  "ArXivIntegration:ArXivPlugin"
  "createDocumentTypeIntegration:createDocumentTypePlugin"
  "sourceIntegrations:paperPlugins"
  "sourceIntegration:paperPlugin"
  "source-integration:paper-plugins"
  "initializeSources:initializePlugins"
  "getSourceForUrl:getPluginForUrl"
  "getSourceById:getPluginById"
  "/source/:plugin"
  "source\.:plugin\."
)

for replacement in "${replacements[@]}"; do
  old="${replacement%%:*}"
  new="${replacement##*:}"
  echo "Replacing \"$old\" with \"$new\""
  
  # Find all TypeScript files
  find . -name "*.ts" -type f | xargs sed -i "s/$old/$new/g"
done

# 4. Special handling for import statements
echo "Updating import paths..."
find . -name "*.ts" -type f | xargs sed -i "s|from ['|\"]\.\.*/source-integration|from '\.\./paper-plugins|g"
find . -name "*.ts" -type f | xargs sed -i "s|from ['|\"]\.\/source-integration|from '\.\/paper-plugins|g"

# 5. Update variable names from camelCase
echo "Updating variable and method names..."
find . -name "*.ts" -type f | xargs sed -i "s/sourceManager/pluginManager/g"
find . -name "*.ts" -type f | xargs sed -i "s/initializeSources/initializePlugins/g"

# 6. Update comments
echo "Updating comments..."
find . -name "*.ts" -type f | xargs sed -i "s/[Ss]ource integration/paper plugin/g"
find . -name "*.ts" -type f | xargs sed -i "s/[Ss]ource [Ii]ntegration/Paper Plugin/g"

# 7. Clean up
echo "Final cleanup..."
if [ -d "source-integration" ]; then
  echo "Removing old source-integration directory"
  rm -rf "source-integration"
fi

echo "Renaming process complete!"
echo "Backup of the original code is available at: $BACKUP_DIR"
echo "Please review the changes carefully before committing."
