# Phishing Email Demonstration

## ⚠️ Educational Purpose Only

This directory contains simulated phishing emails designed for **security awareness training** and **educational demonstrations**. These materials should only be used in controlled lab environments with proper authorization.

## 📧 Available Phishing Scenarios

### 1. PayPal Security Alert (`paypal_email.html`)
A sophisticated phishing email impersonating PayPal's security team, claiming suspicious activity from Nigeria.

**Attack Techniques:**
- Urgency manipulation ("24 hours to verify")
- Fear tactics ("permanent account suspension")
- Professional branding and design
- Detailed fake activity logs
- Threatening language

**Target:** `http://192.168.56.1:3001` (Fake PayPal login)

### 2. Google Security Alert (`google_email.html`)
A convincing email mimicking Google's security notification system, reporting a sign-in from Russia.

**Attack Techniques:**
- Authority impersonation (Google branding)
- Foreign location to create alarm (Moscow)
- Professional design matching Google's style
- Detailed device information
- Two-button choice (psychological manipulation)

**Target:** `http://192.168.56.1:3002` (Fake Google login)

### 3. Microsoft Account Alert (`microsoft_email.html`)
A realistic email imitating Microsoft's account security team, warning about activity from China.

**Attack Techniques:**
- Microsoft branding and color scheme
- Detailed activity information
- Fear-based language ("compromised", "at risk")
- Professional formatting
- Automated message disclaimer

**Target:** `http://192.168.56.1:3003` (Fake Microsoft login)

## 🎯 Email Inbox Simulator (`inbox.html`)

An interactive email inbox interface that displays all three phishing emails in a realistic email client environment.

**Features:**
- Realistic inbox layout
- Unread indicators
- Urgency badges
- Click-to-open functionality
- Educational annotations
- Usage instructions

## 🚀 Quick Start

### Serve the Email Inbox

```bash
cd demo_pages/phishing_emails
python3 -m http.server 3000
```

Then open: `http://192.168.56.1:3000/inbox.html`

### Or Use the Automated Script

From the project root:
```bash
./start_phishing_demo.sh
```

## 🎭 How to Use in Demonstrations

### Step 1: Setup
1. Start all demo components (backend, dashboard, phishing pages)
2. Load PhishGuard extension in test browser
3. Open email inbox in browser
4. Open dashboard in split screen

### Step 2: Demonstrate Without Protection
1. Disable PhishGuard extension
2. Click on any phishing email
3. Click the action button (e.g., "Verify Your Identity")
4. Show how convincing the fake login page looks
5. Explain how credentials would be stolen

### Step 3: Demonstrate With Protection
1. Enable PhishGuard extension
2. Click on a different phishing email
3. Click the action button
4. Watch PhishGuard block the page
5. Show the threat analysis on the dashboard
6. Explain the multi-layer detection

## 🎓 Educational Content

Each email includes:
- **Red Flag Analysis**: Identifies suspicious elements
- **Attack Technique Breakdown**: Explains social engineering tactics
- **Protection Explanation**: Shows how PhishGuard detects the threat
- **Best Practices**: Teaches users how to stay safe

## 🔍 Red Flags to Point Out

### Common Indicators
1. **Generic Greetings**: "Dear Customer" instead of your name
2. **Suspicious URLs**: IP addresses, HTTP instead of HTTPS
3. **Urgency Language**: "Immediate action required", "24 hours"
4. **Threatening Tone**: "Account will be suspended"
5. **Foreign Locations**: Unusual countries in activity logs
6. **Poor Grammar**: Subtle mistakes in professional emails
7. **Unexpected Requests**: Asking for credentials via email

### Technical Indicators
1. **URL Mismatch**: Link text vs. actual destination
2. **No HTTPS**: Missing secure connection
3. **IP-based URLs**: Using IP addresses instead of domains
4. **Suspicious Domains**: Misspellings, extra characters
5. **Missing Certificates**: No valid SSL/TLS

## 🛡️ How PhishGuard AI Detects These

### Linguistic Analysis
- Detects urgency manipulation patterns
- Identifies fear-based language
- Recognizes AI-generated text
- Flags authority impersonation

### Visual Analysis
- Compares page layout with legitimate sites
- Checks logo and branding consistency
- Analyzes form field patterns
- Detects visual cloning attempts

### Behavioral Analysis
- Checks domain reputation
- Validates SSL certificates
- Analyzes WHOIS data
- Checks IP geolocation
- Queries threat databases

## 📊 Demonstration Metrics

Track these during demos:
- Time to detect threat (typically < 1 second)
- Threat confidence score (0-100%)
- Number of red flags identified
- Layer-by-layer risk breakdown
- User engagement with warnings

## 🎬 Presentation Tips

### For Presenters
1. **Practice the flow** multiple times
2. **Know the technical details** behind each detection
3. **Prepare for questions** about false positives
4. **Have backup scenarios** ready
5. **Time your demo** (aim for 5-7 minutes)

### Key Messages
1. Modern phishing is sophisticated and convincing
2. Anyone can fall victim without proper protection
3. Multi-layer detection is essential
4. Education + technology = best defense
5. Always verify before clicking

## 🔒 Security Considerations

### Safe Usage
- ✅ Use only in isolated lab environments
- ✅ Clearly label as educational demos
- ✅ Get proper authorization before testing
- ✅ Never collect real credentials
- ✅ Include educational warnings

### Unsafe Usage
- ❌ Never use on production systems
- ❌ Don't test on real users without consent
- ❌ Never use for malicious purposes
- ❌ Don't remove educational warnings
- ❌ Don't deploy without authorization

## 📚 Additional Resources

### Documentation
- `docs/PHISHING_DEMO_GUIDE.md` - Complete demonstration guide
- `docs/SETUP.md` - System setup instructions
- `docs/DEMO_SCRIPT.md` - Quick presentation script

### Related Files
- `demo_pages/paypal/index.html` - Fake PayPal login page
- `demo_pages/google/index.html` - Fake Google login page
- `demo_pages/microsoft/index.html` - Fake Microsoft login page

## 🐛 Troubleshooting

### Emails Not Loading
- Check Python HTTP server is running on port 3000
- Verify file paths are correct
- Check browser console for errors

### Links Not Working
- Ensure phishing page servers are running (ports 3001-3003)
- Verify IP address matches your setup
- Check firewall settings

### Extension Not Blocking
- Verify PhishGuard extension is enabled
- Check backend connection in extension popup
- Ensure backend API is running
- Review browser console for errors

## 📞 Support

For issues or questions:
1. Check the main project README
2. Review PHISHING_DEMO_GUIDE.md
3. Check backend logs for errors
4. Test each component individually

## ⚖️ Legal Notice

These materials are provided for educational and security awareness purposes only. Unauthorized use of phishing techniques is illegal and unethical. Always:
- Obtain proper authorization
- Use in controlled environments
- Follow responsible disclosure practices
- Comply with local laws and regulations

---

**Remember**: The goal is to educate and empower, not to deceive or harm. Use responsibly!
