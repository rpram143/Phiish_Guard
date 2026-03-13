#!/bin/bash

# PhishGuard AI - Extension Watcher
# Automatically re-packages the extension on every change

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v inotifywait >/dev/null 2>&1; then
    echo -e "${YELLOW}inotify-tools not found. Installing...${NC}"
    sudo pacman -S --noconfirm inotify-tools
fi

# Initial package
./package_extension.sh

echo -e "${GREEN}Watching for changes in extension/ folder...${NC}"

while inotifywait -r -e modify,create,delete,move extension/; do
    echo -e "${YELLOW}Change detected. Re-packaging...${NC}"
    ./package_extension.sh
    echo -e "${GREEN}Update ready. Tell your friend to refresh!${NC}"
done
