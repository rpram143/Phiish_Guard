#!/bin/bash

# PhishGuard AI - Docker Launcher
# Runs the entire application using Docker Compose

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PhishGuard AI - Docker Launcher                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Check for .env file
if [ ! -f "backend/.env" ] && [ -z "$GROQ_API_KEY" ]; then
    echo -e "${YELLOW}Warning: No .env file found in backend/ and GROQ_API_KEY not set.${NC}"
    echo -e "${YELLOW}Linguistic analysis might fail without an API key.${NC}"
    read -p "Enter your Groq API Key (or press Enter to skip): " API_KEY
    if [ -n "$API_KEY" ]; then
        export GROQ_API_KEY=$API_KEY
    fi
elif [ -f "backend/.env" ]; then
    echo -e "${GREEN}Loading configuration from backend/.env...${NC}"
    export $(grep -v '^#' backend/.env | xargs)
fi

echo -e "\n${BLUE}[1/2] Building Docker images...${NC}"
docker-compose build

echo -e "\n${BLUE}[2/2] Starting containers...${NC}"
echo -e "${GREEN}✓ Dashboard will be available at http://localhost:5173${NC}"
echo -e "${GREEN}✓ Backend will be available at http://localhost:8000${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop.${NC}"

docker-compose up
