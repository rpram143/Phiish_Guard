#!/bin/bash

# Kill any existing python http servers to prevent port conflicts
pkill -f "python3 -m http.server"

echo "Starting PhishGuard Demo Environment..."
echo "----------------------------------------"

# Start Microsoft Phishing Site (Port 3003)
cd demo_pages/microsoft
python3 -m http.server 3003 &
echo "Microsoft Phishing Site: http://localhost:3003 (PID: $!)"
cd ../..

# Start PayPal Phishing Site (Port 3001)
cd demo_pages/paypal
python3 -m http.server 3001 &
echo "PayPal Phishing Site:    http://localhost:3001 (PID: $!)"
cd ../..

# Start Email Viewer (Port 8080) - Serve the root so we can access the email file
python3 -m http.server 8080 &
echo "Phishing Email Viewer:   http://localhost:8080/demo_pages/phishing_email.html (PID: $!)"

echo "----------------------------------------"
echo "Demo is live! Open the Email Viewer link to start the attack scenario."
echo "Press Ctrl+C to stop all servers."

# Wait for user input to keep script running
wait
