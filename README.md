# PhishGuard AI - Advanced Phishing Detection System

## 🛡️ Overview

PhishGuard AI is a real-time, AI-powered phishing detection system that protects users from sophisticated social engineering attacks. Using multi-layer analysis combining linguistic AI, visual forensics, and behavioral analysis, PhishGuard identifies and blocks phishing attempts before credentials can be stolen.

## 🎯 Key Features

### Multi-Layer Detection
- **Linguistic Analysis**: Groq LLM detects urgency manipulation, fear tactics, and AI-generated phishing content
- **Visual Analysis**: Perceptual hashing (pHash) compares page layouts with legitimate sites
- **Behavioral Analysis**: Domain reputation, SSL validation, WHOIS data, and threat intelligence

### Real-Time Protection
- Browser extension intercepts suspicious pages instantly
- Live threat analysis dashboard with WebSocket updates
- Educational warnings explain why pages are dangerous
- Zero-configuration protection after installation

### Educational Focus
- Detailed threat breakdowns for security awareness
- Interactive phishing demonstrations
- Red flag identification and best practices
- Security awareness training materials

## 🏗️ Architecture

```
┌─────────────────┐
│  Browser        │
│  Extension      │ ← User visits suspicious site
└────────┬────────┘
         │ Sends URL + content
         ↓
┌─────────────────┐
│  Backend API    │
│  (FastAPI)      │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ↓         ↓          ↓          ↓
┌────────┐ ┌──────┐ ┌────────┐ ┌────────┐
│Linguistic│ │Visual│ │Behavioral│ │Database│
│(Groq AI)│ │(pHash)│ │(WHOIS)  │ │(SQLite)│
└────────┘ └──────┘ └────────┘ └────────┘
         │
         ↓
┌─────────────────┐
│  Dashboard      │
│  (React + Vite) │ ← Real-time threat visualization
└─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Chrome/Chromium browser
- Groq API key ([Get one here](https://console.groq.com))

### 1. Clone and Setup

```bash
git clone <repository-url>
cd hackathon
```

### 2. Run Everything

```bash
# Starts Backend, Dashboard, and Phishing Pages
./run.sh
```

### 3. Extension Setup

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` directory
5. Click the extension icon and configure:
   - Backend API URL: `http://localhost:8000` (or the IP shown in your terminal)
   - Click "Test Connection"

## 🎭 Phishing Demonstration

### What's Included

PhishGuard includes a complete phishing attack simulation for security awareness training:

#### 🔍 Fake Login Pages
- **PayPal**: http://localhost:3001
- **Google**: http://localhost:3002
- **Microsoft**: http://localhost:3003
- Pixel-perfect clones of real sites
- Professional branding and design
- Educational warnings included
- Safe for demonstration purposes

### Running the Demo

```bash
# Start all components
./run.sh

# The script will output the exact URLs to use
```

### Demo Workflow

1. **Without Protection**:
   - Disable PhishGuard extension
   - Visit one of the phishing pages (e.g., PayPal on port 3001)
   - See convincing fake login page

2. **With Protection**:
   - Enable PhishGuard extension
   - Visit the same phishing page
   - Watch PhishGuard block the page
   - View threat analysis on dashboard

### 🎤 Presentation Script

**Opening (30 sec)**
"I'll show you how easy it is to fall victim to modern phishing, and how PhishGuard AI protects you in real-time."

**Without Protection (2 min)**
"You receive an urgent email (e.g. via your real Gmail). It looks legitimate. You click the link... and you're on what looks exactly like PayPal. Without thinking, you could type your credentials... and they're stolen."

**With Protection (3 min)**
"Now let's enable PhishGuard. Same scenario, but watch... The extension intercepts immediately. It's analyzing the language, the visual design, the domain. Within milliseconds, it blocks the page. On the dashboard, we see exactly why: urgency manipulation, suspicious URL, no SSL certificate. The user is protected before they can make a mistake."

**Closing (30 sec)**
"PhishGuard AI uses advanced AI and multi-layer analysis to detect and block sophisticated phishing attacks in real-time. It's not just blocking known threats - it's identifying new, never-before-seen attacks."

### Educational Value

The demo shows:
- How sophisticated modern phishing attacks are
- Common social engineering tactics
- Red flags to watch for
- How multi-layer detection works
- Why security tools are essential

## 📚 Documentation

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and fixes
- **[ARCHITECTURE_FLOWCHART.md](ARCHITECTURE_FLOWCHART.md)** - System architecture diagram

## 🔧 Configuration

### Backend (.env)
```env
GROQ_API_KEY=your_api_key_here
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
```

### Extension
- Backend API URL: Configure in extension popup
- Auto-scan: Enabled by default
- Notifications: Enabled by default

### Dashboard
- API Base URL: Configure in dashboard header
- WebSocket: Auto-connects to backend
- Real-time updates: Enabled by default

## 🎓 How It Works

### 1. Linguistic Analysis (Groq LLM)
```python
# Detects:
- Urgency manipulation ("act now", "24 hours")
- Fear tactics ("account suspended", "compromised")
- Authority impersonation (fake company names)
- AI-generated text patterns
- Grammatical anomalies
```

### 2. Visual Analysis (pHash)
```python
# Compares:
- Page layout structure
- Color schemes and branding
- Logo placement
- Form field patterns
- Button positioning

# Flags:
- High similarity to legitimate sites (85%+)
- Suspicious when combined with wrong domain
```

### 3. Behavioral Analysis
```python
# Checks:
- Domain age and reputation
- SSL certificate validity
- WHOIS data
- IP geolocation
- Known phishing databases
- URL patterns (IP addresses, suspicious TLDs)
```

### 4. Risk Scoring
```python
risk_score = (
    linguistic_score * 0.4 +
    visual_score * 0.3 +
    behavioral_score * 0.3
)

if risk_score > 70:
    block_page()
    show_warning()
    log_threat()
```

## 🛡️ Security Features

### For Users
- Real-time page blocking
- Educational warnings
- Detailed threat analysis
- Zero-configuration protection
- Privacy-focused (local analysis when possible)

### For Administrators
- Centralized threat dashboard
- Historical scan logs
- Threat intelligence feeds
- Customizable risk thresholds
- API for integration

## 📊 Dashboard Features

- **Real-time Threat Feed**: Live updates via WebSocket
- **Risk Score Visualization**: Color-coded threat levels
- **Layer-by-Layer Analysis**: Detailed breakdown
- **Historical Logs**: Searchable scan history
- **Statistics**: Threats blocked, scans performed
- **Export**: Download threat data for analysis

## 🧪 Testing

### Test Phishing Pages
```bash
# PayPal
http://192.168.56.1:3001

# Google
http://192.168.56.1:3002

# Microsoft
http://192.168.56.1:3003
```

### Expected Behavior
- Extension intercepts page load
- Backend analyzes in < 1 second
- Dashboard shows real-time analysis
- Warning overlay blocks access
- Detailed threat report displayed

## 🔍 Troubleshooting

### Extension Not Blocking
- Check backend connection in popup
- Verify backend is running
- Check browser console for errors
- Ensure content script is injected

### Dashboard Not Updating
- Verify WebSocket connection
- Check CORS settings
- Refresh dashboard page
- Check backend logs

### Backend Errors
- Verify Groq API key is valid
- Check Python dependencies
- Review backend logs
- Ensure ports are available

## 🎯 Use Cases

### Security Awareness Training
- Interactive phishing demonstrations
- Employee education programs
- Security workshops and seminars
- Incident response training

### Penetration Testing
- Phishing campaign simulations
- Social engineering assessments
- Security posture evaluation
- Red team exercises

### Research and Development
- Phishing detection algorithms
- AI/ML model training
- Threat intelligence gathering
- Security tool evaluation

## ⚠️ Important Notes

### Educational Purpose
This system is designed for:
- ✅ Security awareness training
- ✅ Educational demonstrations
- ✅ Controlled lab environments
- ✅ Authorized penetration testing

NOT for:
- ❌ Unauthorized testing
- ❌ Malicious purposes
- ❌ Production deployment without consent
- ❌ Real-world attacks

### Legal Compliance
- Always obtain proper authorization
- Use only in controlled environments
- Follow responsible disclosure practices
- Comply with local laws and regulations
- Never collect real credentials

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is for educational purposes. See LICENSE file for details.

## 🙏 Acknowledgments

- **Groq**: For powerful LLM API
- **FastAPI**: For excellent backend framework
- **React + Vite**: For modern frontend development
- **Tailwind CSS**: For beautiful UI components

## 📞 Support

For questions or issues:
- Check documentation in `docs/`
- Review troubleshooting section
- Check backend logs
- Test components individually

## 🎓 Learning Resources

### Phishing Awareness
- [PHISHING_DEMO_GUIDE.md](docs/PHISHING_DEMO_GUIDE.md)
- [Email Demo README](demo_pages/phishing_emails/README.md)

### Technical Details
- [SETUP.md](docs/SETUP.md)
- [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)

### Best Practices
- Always verify URLs before clicking
- Enable multi-factor authentication
- Use password managers
- Keep software updated
- Report suspicious emails

---

**Remember**: The best defense against phishing is education + technology. Stay vigilant, stay safe! 🛡️
