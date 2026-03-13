#!/bin/bash

# PhishGuard AI - Network Connectivity Tester
# Helps debug connections between laptops/VMs

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PhishGuard AI - Network Check Tool                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Detect IPs
IP_LIST=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1)

if [ -z "$IP_LIST" ]; then
    echo -e "${RED}Error: No network IP found! Check your Wi-Fi connection.${NC}"
    exit 1
fi

echo -e "\n${BLUE}1. Your Laptop's LAN IP Address(es):${NC}"
for IP in $IP_LIST; do
    echo -e "   - ${GREEN}$IP${NC} (Use this for the extension)"
done

echo -e "\n${BLUE}2. Port Status Check:${NC}"
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "   [${GREEN}ONLINE${NC}] Port $1 (Backend/Dashboard)"
    else
        echo -e "   [${RED}OFFLINE${NC}] Port $1 (Not running)"
    fi
}
check_port 8000
check_port 5173

echo -e "\n${BLUE}3. Firewall Check (Linux):${NC}"
if command -v ufw >/dev/null 2>&1; then
    STATUS=$(sudo ufw status | grep "Status: active" || true)
    if [ -n "$STATUS" ]; then
        echo -e "${YELLOW}Warning: Firewall (ufw) is active.${NC}"
        echo -e "To allow your friend to connect, run:"
        echo -e "  sudo ufw allow 8000/tcp"
        echo -e "  sudo ufw allow 5173/tcp"
    else
        echo -e "${GREEN}✓ Firewall (ufw) is inactive/disabled.${NC}"
    fi
else
    echo -e "No ufw detected. Check your system's firewall settings if needed."
fi

echo -e "\n${BLUE}4. Copy-Paste this for your Friend:${NC}"
PRIMARY_IP=$(echo $IP_LIST | awk '{print $1}')
echo -e "   --------------------------------------------------------"
echo -e "   Extension API URL:  ${YELLOW}http://$PRIMARY_IP:8000${NC}"
echo -e "   Dashboard URL:      ${YELLOW}http://$PRIMARY_IP:5173${NC}"
echo -e "   Phishing Link 1:    ${YELLOW}http://$PRIMARY_IP:3001${NC}"
echo -e "   --------------------------------------------------------"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Run ./run.sh first."
echo -e "  2. Tell your friend to join the same Wi-Fi."
echo -e "  3. Paste the URLs above into their browser/extension."
