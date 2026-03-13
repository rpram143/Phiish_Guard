#!/bin/bash

# PhishGuard AI - Extension Packager
# Compresses the extension for easy distribution

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Packaging extension...${NC}"

# Remove old zip if it exists
rm -f extension.zip

# Create new zip
# -j junk paths (don't include the 'extension/' parent folder in the zip structure)
# -r recursive
cd extension && zip -r ../extension.zip . -x "*.DS_Store*" -x "__MACOSX*"
cd ..

echo -e "${GREEN}✓ extension.zip created successfully!${NC}"
