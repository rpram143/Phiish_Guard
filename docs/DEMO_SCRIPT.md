# PhishGuard AI - Demo Script

## Intro (30 Seconds)
- "This is PhishGuard AI. We protect users against the next generation of social engineering: AI-generated phishing."
- "Modern phishing is no longer just bad grammar; it's semantically perfect and visually identical."

## Scenario A: Without PhishGuard (60 Seconds)
1. Disable PhishGuard extension in VM.
2. Navigate to `http://192.168.56.1:3001` (Fake PayPal).
3. Show the user typing credentials.
4. "Without protection, the user is one click away from losing their identity."

## Scenario B: With PhishGuard (90 Seconds)
1. Enable PhishGuard extension in VM.
2. Navigate to `http://192.168.56.1:3001` again.
3. **IMMEDIATE:** The Browser Extension intercepts the load.
4. **BACKEND:** PhishGuard Backend analyzes:
   - Groq LLM detects "Urgency Manipulation" and "AI-generated tone".
   - Levenshtein check flags the IP-based URL as suspicious for PayPal.
5. **DASHBOARD (RIGHT WINDOW):** Live feed lights up red. Charts show high risk in Linguistic and Behavioral layers.
6. **VM (LEFT WINDOW):** A full-page PhisGuard Warning Overlay blocks the screen.
7. "The user is stopped before they even see the login form. The AI has identified the attack pattern in real-time."

## Deep Dive (Tech Stack)
- Mention Groq (LLM) for linguistic analysis.
- Mention pHash for visual layout forensics.
- Mention WHOIS/VirusTotal for behavioral signals.
