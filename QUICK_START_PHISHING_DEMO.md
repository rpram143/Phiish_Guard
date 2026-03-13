# PhishGuard AI - Phishing Demo Quick Start

## 🚀 5-Minute Setup

### Step 1: Start Everything (1 command)
```bash
./start_phishing_demo.sh
```

This automatically starts:
- ✅ Backend API (port 8000)
- ✅ Dashboard (port 5173)
- ✅ Email Inbox (port 3000)
- ✅ All phishing pages (ports 3001-3003)

### Step 2: Open Your Browser
1. **Email Inbox**: http://192.168.56.1:3000/inbox.html
2. **Dashboard**: http://localhost:5173 (in split screen)

### Step 3: Load Extension
1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `extension/` folder
4. Click extension icon → Set Backend URL: `http://192.168.56.1:8000`
5. Click "Test Connection" → Should show ✅ Connected

## 🎭 Run the Demo

### Without Protection (Show the Threat)
1. **Disable** PhishGuard extension
2. Click on "PayPal Security Alert" email
3. Click "Verify Your Identity Now"
4. **Point out**: How convincing the fake page looks
5. **Explain**: Credentials would be stolen here

### With Protection (Show the Defense)
1. **Enable** PhishGuard extension
2. Click on "Google Security Alert" email
3. Click "Secure Your Account"
4. **Watch**: PhishGuard blocks the page instantly
5. **Show**: Dashboard displays threat analysis
6. **Explain**: Multi-layer detection in action

## 📊 What to Show

### On the Warning Page
- ⚠️ Red warning overlay
- 🎯 Risk score (usually 85-95%)
- 📝 Detailed threat analysis
- 🚫 Blocked access message

### On the Dashboard
- 📈 Real-time threat feed
- 🔴 High-risk indicators
- 📊 Layer-by-layer breakdown:
  - Linguistic: Urgency manipulation detected
  - Visual: 85% similarity to real site
  - Behavioral: IP-based URL, no SSL

## 🎯 Key Points to Emphasize

1. **Modern phishing is sophisticated**
   - Professional design
   - Perfect grammar
   - Convincing branding

2. **Social engineering tactics**
   - Urgency ("24 hours")
   - Fear ("account suspended")
   - Authority (fake company names)

3. **Multi-layer detection**
   - AI analyzes language patterns
   - Visual comparison with real sites
   - Domain reputation checks

4. **Real-time protection**
   - Blocks before credentials entered
   - Educational warnings
   - Detailed threat analysis

## 🔍 Red Flags to Point Out

In the emails:
- ❌ Generic greeting ("Dear Customer")
- ❌ Suspicious URL (IP address)
- ❌ Urgency language ("immediate action")
- ❌ Threatening tone ("permanent suspension")
- ❌ Foreign locations (Nigeria, Russia, China)

On the fake pages:
- ❌ HTTP instead of HTTPS
- ❌ IP address in URL bar
- ❌ No valid SSL certificate
- ❌ Suspicious domain

## 📧 Available Scenarios

### 1. PayPal Phishing
- **Email**: Account compromise from Nigeria
- **URL**: http://192.168.56.1:3001
- **Tactics**: Urgency, fear, threatening language

### 2. Google Phishing
- **Email**: Unrecognized sign-in from Russia
- **URL**: http://192.168.56.1:3002
- **Tactics**: Security concern, foreign location

### 3. Microsoft Phishing
- **Email**: Suspicious activity from China
- **URL**: http://192.168.56.1:3003
- **Tactics**: Account compromise, fear-based

## ⏱️ Timing Guide

- **Setup**: 2 minutes
- **Demo without protection**: 2 minutes
- **Demo with protection**: 3 minutes
- **Q&A**: 3 minutes
- **Total**: ~10 minutes

## 🎤 Presentation Script

### Opening (30 sec)
"I'll show you how easy it is to fall victim to modern phishing, and how PhishGuard AI protects you in real-time."

### Without Protection (2 min)
"Here's your inbox. You receive this urgent email from PayPal. It looks legitimate, right? Professional design, specific details. You click the link... and you're on what looks exactly like PayPal. Without thinking, you could type your credentials... and they're stolen."

### With Protection (3 min)
"Now let's enable PhishGuard. Same scenario, but watch... The extension intercepts immediately. It's analyzing the language, the visual design, the domain. Within milliseconds, it blocks the page. On the dashboard, we see exactly why: urgency manipulation, suspicious URL, no SSL certificate. The user is protected before they can make a mistake."

### Closing (30 sec)
"PhishGuard AI uses advanced AI and multi-layer analysis to detect and block sophisticated phishing attacks in real-time. It's not just blocking known threats - it's identifying new, never-before-seen attacks."

## 🛠️ Troubleshooting

### Extension not blocking?
```bash
# Check backend is running
curl http://192.168.56.1:8000

# Check extension connection
# Click extension icon → Should show "Connected"
```

### Dashboard not updating?
```bash
# Restart dashboard
cd dashboard && npm run dev
```

### Phishing pages not loading?
```bash
# Check servers are running
lsof -i :3001  # PayPal
lsof -i :3002  # Google
lsof -i :3003  # Microsoft
```

## 📚 More Information

- **Full Guide**: [docs/PHISHING_DEMO_GUIDE.md](docs/PHISHING_DEMO_GUIDE.md)
- **Setup Details**: [docs/SETUP.md](docs/SETUP.md)
- **Email Details**: [demo_pages/phishing_emails/README.md](demo_pages/phishing_emails/README.md)

## 🎓 Learning Objectives

After this demo, viewers should understand:
1. ✅ How sophisticated modern phishing is
2. ✅ Common social engineering tactics
3. ✅ Red flags to watch for
4. ✅ How multi-layer detection works
5. ✅ Why security tools are essential

## ⚠️ Important Reminders

- 🔒 This is for **educational purposes only**
- 🎓 Use in **controlled environments**
- ✅ Always get **proper authorization**
- 📚 Focus on **education, not fear**
- 🛡️ Emphasize **prevention and protection**

---

**Ready to go? Run `./start_phishing_demo.sh` and start protecting users!** 🛡️
