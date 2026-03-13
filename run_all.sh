#!/bin/bash

# PhishGuard AI - Master Launch Script
# Starts all components: Backend, Dashboard, and Phishing Demo Environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PhishGuard AI - Master Launch Script               ║${NC}"
echo -e "${BLUE}║              Educational Security Demonstration            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Function to kill process on a port
kill_port() {
    local port=$1
    if ! command -v lsof >/dev/null 2>&1; then
        echo -e "${YELLOW}lsof not found; skipping port cleanup for $port${NC}"
        return 0
    fi

    local pid
    pid=$(lsof -t -i:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Cleaning up port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null || true
    fi
}

# 1. Cleanup existing processes
echo -e "\n${BLUE}[1/5] Cleaning up existing ports...${NC}"
for port in 8000 5173 3000 3001 3002 3003; do
    kill_port $port
done

# 2. Start Backend
echo -e "\n${BLUE}[2/5] Starting Backend API...${NC}"
./backend/setup_backend.sh
cd backend
nohup ./venv/bin/python3 -m app.main > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (Port: 8000)${NC}"
cd ..

# 3. Start Dashboard
echo -e "\n${BLUE}[3/5] Starting Dashboard...${NC}"
cd dashboard
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dashboard dependencies...${NC}"
    npm install
fi
nohup npm run dev -- --port 5173 --host > dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo -e "${GREEN}✓ Dashboard started (Port: 5173)${NC}"
cd ..

# 4. Start Email Inbox
echo -e "\n${BLUE}[4/5] Starting Email Inbox Simulator...${NC}"
cd demo_pages/phishing_emails
nohup python3 -m http.server 3000 > inbox.log 2>&1 &
INBOX_PID=$!
echo -e "${GREEN}✓ Email Inbox started (Port: 3000)${NC}"
cd ../..

# 5. Start Phishing Pages
echo -e "\n${BLUE}[5/5] Starting Phishing Pages (PayPal, Google, Microsoft)...${NC}"
cd demo_pages/paypal && nohup python3 -m http.server 3001 > paypal.log 2>&1 &
PAYPAL_PID=$!
cd ../google && nohup python3 -m http.server 3002 > google.log 2>&1 &
GOOGLE_PID=$!
cd ../microsoft && nohup python3 -m http.server 3003 > microsoft.log 2>&1 &
MICROSOFT_PID=$!
echo -e "${GREEN}✓ Phishing pages started (Ports: 3001-3003)${NC}"
cd ../..

# Final Summary
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              All Components Running Successfully!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Access URLs (from your VM):${NC}"
HOST_IP="${VM_HOST_IP:-127.0.0.1}"
echo -e "  ${YELLOW}📧 Email Inbox:${NC}        http://$HOST_IP:3000/inbox.html"
echo -e "  ${YELLOW}📊 Dashboard:${NC}          http://$HOST_IP:5173"
echo -e "  ${YELLOW}🔧 Backend API:${NC}        http://$HOST_IP:8000"
echo ""
echo -e "${BLUE}Phishing Pages (Targets):${NC}"
echo -e "  ${YELLOW}PayPal:${NC}               http://$HOST_IP:3001"
echo -e "  ${YELLOW}Google:${NC}               http://$HOST_IP:3002"
echo -e "  ${YELLOW}Microsoft:${NC}            http://$HOST_IP:3003"

echo -e "\n${BLUE}Demo Workflow:${NC}"
echo -e "  1. Open the Dashboard"
echo -e "  2. Open the Email Inbox"
echo -e "  3. Click a phishing link"
echo -e "  4. Watch PhishGuard in action!"

# Keep script alive and handle exit
cleanup() {
    echo -e "\n\n${YELLOW}Shutting down all components...${NC}"
    kill $BACKEND_PID $DASHBOARD_PID $INBOX_PID $PAYPAL_PID $GOOGLE_PID $MICROSOFT_PID 2>/dev/null || true
    echo -e "${GREEN}Goodbye!${NC}"
    exit 0
}

trap cleanup EXIT INT TERM

echo -e "\n${GREEN}Press Ctrl+C to stop all servers.${NC}"
while true; do sleep 1; done
