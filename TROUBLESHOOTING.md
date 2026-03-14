# PhishGuard AI - Troubleshooting Guide

## Common Issues and Solutions

### Issue: "UNVERIFIED LINK - No response from background scan"

**Symptoms:**
- Extension shows "UNVERIFIED LINK" error
- Message says "PhishGuard couldn't analyze this request"
- Reason: "No response from background scan"

**Root Cause:**
The PhishGuard backend API is not running or not accessible.

**If the reason mentions "aborted" / "timed out":**
- The backend is reachable, but the scan is taking too long (the extension times out after ~15s).
- This is usually caused by slow external lookups (LLM calls, WHOIS, redirects, screenshots).
- Quick mitigations:
  - Ensure your `GROQ_API_KEY` is valid (or accept that linguistic/vision will be skipped).
  - Set `PHISHGUARD_DISABLE_PLAYWRIGHT=1` in `backend/.env` to avoid Playwright screenshot attempts in restricted environments.

**Solution:**

1. **Start the Backend API**
   ```bash
   cd backend
   source venv/bin/activate  # or: venv/bin/python -m app.main
   python -m app.main
   ```
   
   The backend should start on `http://localhost:8000` or `http://192.168.56.1:8000`

2. **Verify Backend is Running**
   ```bash
   curl http://localhost:8000/health
   ```
   
   You should see a response like: `{"status":"healthy"}`
   
   Alternative (versioned API):
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

3. **Check Extension Configuration**
   - Click the PhishGuard extension icon
   - Verify the API URL is set correctly:
     - For localhost: `http://localhost:8000`
     - For VM host-only network: `http://192.168.56.1:8000`
   - Click "Test Connection" to verify

4. **Use the Demo Launcher**
   The easiest way to start all components:
   ```bash
   ./start_phishing_demo.sh
   ```
   
   This automatically starts:
   - Backend API (port 8000)
   - Dashboard (port 5173)
   - Demo pages (ports 3000-3003)

---

### Issue: Backend Won't Start - Missing Dependencies

**Symptoms:**
- Error: `ModuleNotFoundError: No module named 'fastapi'`
- Backend fails to start

**Solution:**

1. **Recreate Virtual Environment**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Verify Installation**
   ```bash
   venv/bin/python -c "import fastapi; print('FastAPI installed')"
   ```

---

### Issue: Extension Not Blocking Phishing Pages

**Symptoms:**
- Phishing pages load without warning
- No overlay appears

**Possible Causes & Solutions:**

1. **Backend Not Running**
   - See "UNVERIFIED LINK" solution above

2. **Page is Whitelisted**
   - Gmail, Google, PayPal, etc. are whitelisted by default
   - This is intentional to avoid false positives
   - To test, use the demo phishing pages:
     - `http://192.168.56.1:3001` (PayPal)
     - `http://192.168.56.1:3002` (Google)
     - `http://192.168.56.1:3003` (Microsoft)

3. **Extension Not Loaded**
   - Go to `chrome://extensions`
   - Verify PhishGuard is enabled
   - Check for errors in the extension

4. **Content Script Not Injected**
   - Open browser console (F12)
   - Look for: `"PhishGuard AI: Content script active"`
   - If missing, reload the extension

---

### Issue: Database Errors

**Symptoms:**
- Backend logs show database errors
- Scans not being saved

**Solution:**

1. **Delete and Regenerate Database**
   ```bash
   cd backend
   rm phishguard.db
   # Database will be recreated on next backend start
   python -m app.main
   ```

---

### Issue: Groq API Errors

**Symptoms:**
- Error: `Invalid API key`
- Linguistic analysis fails

**Solution:**

1. **Check API Key**
   ```bash
   cd backend
   cat .env | grep GROQ_API_KEY
   ```

2. **Get New API Key**
   - Visit: https://console.groq.com
   - Create account and generate API key
   - Update [`backend/.env`](backend/.env):
     ```
     GROQ_API_KEY=your_new_key_here
     ```

3. **Restart Backend**
   ```bash
   cd backend
   venv/bin/python -m app.main
   ```

---

### Issue: Dashboard Not Updating

**Symptoms:**
- Dashboard shows no scans
- Real-time updates not working

**Solution:**

1. **Check WebSocket Connection**
   - Open browser console on dashboard
   - Look for WebSocket connection errors

2. **Verify Backend is Running**
   ```bash
   curl http://localhost:8000/api/v1/scans
   ```

3. **Restart Dashboard**
   ```bash
   cd dashboard
   npm run dev
   ```

4. **Check CORS Settings**
   - Backend should allow dashboard origin
   - Check [`backend/app/main.py`](backend/app/main.py) CORS configuration

---

### Issue: Port Already in Use

**Symptoms:**
- Error: `Address already in use`
- Backend or dashboard won't start

**Solution:**

1. **Find Process Using Port**
   ```bash
   # For backend (port 8000)
   lsof -i :8000
   
   # For dashboard (port 5173)
   lsof -i :5173
   ```

2. **Kill Process**
   ```bash
   kill -9 <PID>
   ```

3. **Or Use Different Port**
   ```bash
   # Backend
   BACKEND_PORT=8001 python -m app.main
   
   # Dashboard
   npm run dev -- --port 5174
   ```

---

### Issue: Extension Shows Wrong Risk Score

**Symptoms:**
- Legitimate sites flagged as phishing

---

### Quick Smoke Check (No Browser Required)

Run a basic syntax sanity check for the extension + backend:

```bash
./smoke_check.sh
```
- Phishing sites marked as safe

**Solution:**

1. **Check Backend Logs**
   ```bash
   tail -f backend/backend.log
   ```

2. **Verify All Services Running**
   - Groq API (linguistic analysis)
   - Visual analysis (screenshot capture)
   - Behavioral analysis (WHOIS, SSL)

3. **Test Individual Components**
   ```bash
   curl -X POST http://localhost:8000/api/v1/scan \
     -H "Content-Type: application/json" \
     -d '{"url":"http://example.com","html_content":"test","text_content":"test"}'
   ```

---

## Quick Fixes

### Reset Everything

```bash
# Stop all processes
pkill -f "python.*app.main"
pkill -f "npm run dev"
pkill -f "http.server"

# Clean up
cd backend
rm -rf venv phishguard.db backend.log
cd ../dashboard
rm -rf node_modules

# Reinstall
cd ../backend
./setup_backend.sh

cd ../dashboard
npm install

# Restart
cd ..
./start_phishing_demo.sh
```

### Check System Status

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check if dashboard is running
curl http://localhost:5173

# Check extension status
# Open chrome://extensions and look for PhishGuard

# Check logs
tail -f backend/backend.log
tail -f logs/backend.log
```

---

## Getting Help

If you're still experiencing issues:

1. **Check Logs**
   - Backend: [`backend/backend.log`](backend/backend.log) or [`logs/backend.log`](logs/backend.log)
   - Dashboard: [`logs/dashboard.log`](logs/dashboard.log)
   - Browser console (F12)

2. **Verify Environment**
   - Python version: `python3 --version` (3.8+ required)
   - Node version: `node --version` (16+ required)
   - Chrome version: `chrome://version`

3. **Review Documentation**
   - [README.md](README.md) - Main documentation
   - [docs/SETUP.md](docs/SETUP.md) - Setup instructions
   - [docs/PHISHING_DEMO_GUIDE.md](docs/PHISHING_DEMO_GUIDE.md) - Demo guide

4. **Test Components Individually**
   - Backend: `cd backend && venv/bin/python -m app.main`
   - Dashboard: `cd dashboard && npm run dev`
   - Extension: Load in Chrome and check console

---

## Prevention

To avoid these issues in the future:

1. **Use the Demo Launcher**
   ```bash
   ./start_phishing_demo.sh
   ```
   This handles all startup and configuration automatically.

2. **Keep Dependencies Updated**
   ```bash
   cd backend && venv/bin/pip install -r requirements.txt --upgrade
   cd dashboard && npm update
   ```

3. **Use Version Control**
   - The [`.gitignore`](.gitignore) file prevents committing:
     - Virtual environments
     - Log files
     - Database files
     - Archive files
     - Node modules

4. **Regular Cleanup**
   ```bash
   # Remove old logs
   rm -f backend/*.log logs/*.log
   
   # Remove old database (will regenerate)
   rm -f backend/phishguard.db
   ```

---

**Remember**: PhishGuard requires the backend API to be running for the extension to work. Always start the backend before testing the extension!
