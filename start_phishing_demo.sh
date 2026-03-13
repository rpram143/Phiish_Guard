#!/bin/bash

# PhishGuard AI - Phishing Demo Launcher
# This script starts all components needed for the phishing demonstration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PhishGuard AI - Phishing Demo Launcher            ║${NC}"
echo -e "${BLUE}║              Educational Security Demonstration            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Warning banner
echo -e "${RED}⚠️  WARNING: EDUCATIONAL PURPOSES ONLY${NC}"
echo -e "${YELLOW}This demo simulates phishing attacks for security awareness training.${NC}"
echo -e "${YELLOW}Only use in controlled lab environments with proper authorization.${NC}"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Check if required directories exist
if [ ! -d "backend" ] || [ ! -d "demo_pages" ] || [ ! -d "extension" ]; then
    echo -e "${RED}Error: Required directories not found. Run from project root.${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}Warning: Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Check required ports
echo -e "${BLUE}Checking ports...${NC}"
PORTS_OK=true
for port in 8000 5173 3000 3001 3002 3003; do
    if ! check_port $port; then
        PORTS_OK=false
    fi
done

if [ "$PORTS_OK" = false ]; then
    echo -e "${YELLOW}Some ports are in use. Continue anyway? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Starting PhishGuard AI Demo Components...${NC}"
echo ""

# Pick a demo host for printing URLs (works on most laptops; VM host-only users can export DEMO_HOST)
if [ -n "${DEMO_HOST:-}" ]; then
    : # Respect user override
elif command -v ip >/dev/null 2>&1 && ip -o -4 addr show 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | grep -q '^192\.168\.56\.1$'; then
    DEMO_HOST="192.168.56.1"
else
    DEMO_HOST="localhost"
fi

# Create logs directory
mkdir -p logs

# Start Backend
echo -e "${BLUE}[1/6] Starting Backend API...${NC}"
./backend/setup_backend.sh
cd backend
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found in backend/. Using defaults.${NC}"
fi

# Bind to all interfaces; extension/demo pages can still reach it via localhost or host-only IP
nohup ./venv/bin/python3 -m app.main > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID, Port: 8000)${NC}"
cd ..
sleep 2

# Start Dashboard
echo -e "${BLUE}[2/6] Starting Dashboard...${NC}"
cd dashboard
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dashboard dependencies...${NC}"
    npm install > ../logs/dashboard-install.log 2>&1
fi
npm run dev > ../logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo -e "${GREEN}✓ Dashboard started (PID: $DASHBOARD_PID, Port: 5173)${NC}"
cd ..
sleep 2

# Start Email Inbox
echo -e "${BLUE}[3/6] Starting Email Inbox (Phishing Emails)...${NC}"
cd demo_pages/phishing_emails
python3 -m http.server 3000 > ../../logs/inbox.log 2>&1 &
INBOX_PID=$!
echo -e "${GREEN}✓ Email Inbox started (PID: $INBOX_PID, Port: 3000)${NC}"
cd ../..
sleep 1

# Start PayPal Phishing Page
echo -e "${BLUE}[4/6] Starting PayPal Phishing Page...${NC}"
cd demo_pages/paypal
python3 -m http.server 3001 > ../../logs/paypal.log 2>&1 &
PAYPAL_PID=$!
echo -e "${GREEN}✓ PayPal page started (PID: $PAYPAL_PID, Port: 3001)${NC}"
cd ../..
sleep 1

# Start Google Phishing Page
echo -e "${BLUE}[5/6] Starting Google Phishing Page...${NC}"
cd demo_pages/google
python3 -m http.server 3002 > ../../logs/google.log 2>&1 &
GOOGLE_PID=$!
echo -e "${GREEN}✓ Google page started (PID: $GOOGLE_PID, Port: 3002)${NC}"
cd ../..
sleep 1

# Start Microsoft Phishing Page
echo -e "${BLUE}[6/6] Starting Microsoft Phishing Page...${NC}"
cd demo_pages/microsoft
python3 -m http.server 3003 > ../../logs/microsoft.log 2>&1 &
MICROSOFT_PID=$!
echo -e "${GREEN}✓ Microsoft page started (PID: $MICROSOFT_PID, Port: 3003)${NC}"
cd ../..
sleep 1

# Save PIDs to file for cleanup
echo "$BACKEND_PID" > logs/demo.pids
echo "$DASHBOARD_PID" >> logs/demo.pids
echo "$INBOX_PID" >> logs/demo.pids
echo "$PAYPAL_PID" >> logs/demo.pids
echo "$GOOGLE_PID" >> logs/demo.pids
echo "$MICROSOFT_PID" >> logs/demo.pids

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              All Components Started Successfully!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Display access URLs
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  ${YELLOW}📧 Email Inbox:${NC}        http://${DEMO_HOST}:3000/inbox.html"
echo -e "  ${YELLOW}📊 Dashboard:${NC}          http://localhost:5173"
echo -e "  ${YELLOW}🔧 Backend API:${NC}        http://${DEMO_HOST}:8000"
echo ""
echo -e "${BLUE}Phishing Pages (for testing):${NC}"
echo -e "  ${YELLOW}PayPal:${NC}               http://${DEMO_HOST}:3001"
echo -e "  ${YELLOW}Google:${NC}               http://${DEMO_HOST}:3002"
echo -e "  ${YELLOW}Microsoft:${NC}            http://${DEMO_HOST}:3003"
echo ""

# Display demo instructions
echo -e "${BLUE}Quick Start:${NC}"
echo -e "  1. Open the Email Inbox in your browser"
echo -e "  2. Open the Dashboard in a split screen"
echo -e "  3. Load the PhishGuard extension in your test browser"
echo -e "  4. Click on any phishing email and follow the link"
echo -e "  5. Watch PhishGuard block the attack in real-time!"
echo ""

echo -e "${YELLOW}📚 For detailed instructions, see: docs/PHISHING_DEMO_GUIDE.md${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down demo components...${NC}"
    if [ -f logs/demo.pids ]; then
        while read pid; do
            if ps -p $pid > /dev/null 2>&1; then
                kill $pid 2>/dev/null || true
                echo -e "${GREEN}✓ Stopped process $pid${NC}"
            fi
        done < logs/demo.pids
        rm logs/demo.pids
    fi
    echo -e "${GREEN}Demo stopped. Goodbye!${NC}"
    exit 0
}

# Register cleanup on script exit
trap cleanup EXIT INT TERM

# Keep script running
echo -e "${GREEN}Demo is running. Press Ctrl+C to stop all components.${NC}"
echo ""

# Monitor processes
while true; do
    sleep 5
    # Check if any process died
    if [ -f logs/demo.pids ]; then
        while read pid; do
            if ! ps -p $pid > /dev/null 2>&1; then
                echo -e "${RED}Warning: Process $pid has stopped${NC}"
            fi
        done < logs/demo.pids
    fi
done
