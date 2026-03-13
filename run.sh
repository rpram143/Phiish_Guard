#!/bin/bash

# PhishGuard AI - Unified Demo Launcher
# Starts Backend, Dashboard, and all Phishing Demo pages in one command.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PhishGuard AI - Unified Demo Launcher              ║${NC}"
echo -e "${BLUE}║              Educational Security Demonstration            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Detect Local IP (for cross-laptop demo)
LOCAL_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | head -n 1 | awk '{print $2}' | cut -d/ -f1)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
fi

# Function to kill process on a port
kill_port() {
    local port=$1
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

# Create logs directory
mkdir -p logs

# 2. Start Backend
echo -e "\n${BLUE}[2/5] Starting Backend API...${NC}"
./backend/setup_backend.sh
cd backend
# Explicitly allow external connections for the demo
export VM_HOST_IP=$LOCAL_IP
nohup ./venv/bin/python3 -m app.main > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started on http://$LOCAL_IP:8000${NC}"
cd ..

# 3. Start Dashboard
echo -e "\n${BLUE}[3/5] Starting Dashboard...${NC}"
cd dashboard
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dashboard dependencies...${NC}"
    npm install > ../logs/dashboard-install.log 2>&1
fi
# Expose dashboard to network
nohup npm run dev -- --port 5173 --host > ../logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo -e "${GREEN}✓ Dashboard started on http://$LOCAL_IP:5173${NC}"
cd ..

# 4. Start Email Inbox Simulator
echo -e "\n${BLUE}[4/5] Starting Email Inbox Simulator...${NC}"
cd demo_pages/phishing_emails
nohup python3 -m http.server 3000 > ../../logs/inbox.log 2>&1 &
INBOX_PID=$!
echo -e "${GREEN}✓ Email Inbox started on http://$LOCAL_IP:3000/inbox.html${NC}"
cd ../..

# 5. Start Phishing Pages
echo -e "\n${BLUE}[5/5] Starting Phishing Pages...${NC}"
cd demo_pages/paypal && nohup python3 -m http.server 3001 > ../../logs/paypal.log 2>&1 &
PAYPAL_PID=$!
cd ../google && nohup python3 -m http.server 3002 > ../../logs/google.log 2>&1 &
GOOGLE_PID=$!
cd ../microsoft && nohup python3 -m http.server 3003 > ../../logs/microsoft.log 2>&1 &
MICROSOFT_PID=$!
echo -e "${GREEN}✓ Phishing pages started (Ports: 3001-3003)${NC}"
cd ../..

# Final Summary
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              All Components Running Successfully!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Settings for your Friend's Laptop (Victim):${NC}"
echo -e "  1. Extension API Base URL:  ${YELLOW}http://$LOCAL_IP:8000${NC}"
echo -e "  2. Open Email Inbox:       ${YELLOW}http://$LOCAL_IP:3000/inbox.html${NC}"

echo -e "\n${BLUE}URLs for your Laptop (Admin):${NC}"
echo -e "  📊 Dashboard:               ${YELLOW}http://localhost:5173${NC}"
echo -e "  🔧 Backend API Health:      ${YELLOW}http://localhost:8000/health${NC}"

echo -e "\n${BLUE}Phishing Targets:${NC}"
echo -e "  PayPal:                    http://$LOCAL_IP:3001"
echo -e "  Google:                    http://$LOCAL_IP:3002"
echo -e "  Microsoft:                 http://$LOCAL_IP:3003"

# Cleanup function
cleanup() {
    echo -e "\n\n${YELLOW}Shutting down all components...${NC}"
    kill $BACKEND_PID $DASHBOARD_PID $INBOX_PID $PAYPAL_PID $GOOGLE_PID $MICROSOFT_PID 2>/dev/null || true
    echo -e "${GREEN}Goodbye!${NC}"
    exit 0
}

trap cleanup EXIT INT TERM

echo -e "\n${GREEN}Press Ctrl+C to stop all servers.${NC}"
while true; do sleep 1; done
