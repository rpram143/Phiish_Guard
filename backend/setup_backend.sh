#!/bin/bash
set -e

echo "Setting up backend environment..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
if [ -f "requirements.txt" ]; then
    echo "Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
else
    echo "requirements.txt not found!"
    exit 1
fi

# Install Playwright browsers
echo "Installing Playwright browsers..."
if command -v pacman >/dev/null 2>&1; then
    echo "Arch Linux detected. Chromium is already installed."
    # We tell playwright to use the system chromium later in the code
else
    playwright install chromium
fi

echo "Backend setup complete."
