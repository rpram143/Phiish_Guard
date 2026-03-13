# PhishGuard AI - Hackathon Setup Guide

## 1. Network Setup (VirtualBox)
To ensure the Victim VM can communicate with the Host machine:
1. Open VirtualBox Manager.
2. Select your Windows 10 VM -> Settings -> Network.
3. Adapter 1: Select **Host-only Adapter**.
4. Name: Usually `vboxnet0` (Linux) or `VirtualBox Host-Only Ethernet Adapter` (Windows).
5. On the **Host Machine**, ensure the IP `192.168.56.1` is assigned to this adapter.
6. On the **Victim VM**, set a static IP like `192.168.56.101`.

## 2. Backend Setup (Host)
```bash
cd backend
pip install -r requirements.txt
# Populate .env with GROQ_API_KEY (and BACKEND_HOST/BACKEND_PORT if needed)
# Run as a module so imports resolve correctly:
python3 -m app.main
```

## 3. Extension Setup (Victim VM)
1. Open Chrome in the VM.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `extension` folder (copy it over to the VM via Shared Folders).
5. Open the extension popup and set **Backend API URL** to:
   - `http://192.168.56.1:8000/api/v1/scan`
   - (or paste just `http://192.168.56.1:8000` and click Save)
6. Click **Test Connection** (the VM must be able to reach the host-only IP).

## 4. Dashboard Setup (Host)
```bash
cd dashboard
npm run dev
```
In the dashboard header card, set **API base URL** to `http://192.168.56.1:8000` (or whatever your backend is bound to).

## 5. Demo Phishing Pages (Host)
You can serve these using a simple python server:
```bash
# PayPal (Port 3001)
cd demo_pages/paypal && python3 -m http.server 3001

# Google (Port 3002)
cd demo_pages/google && python3 -m http.server 3002

# Microsoft (Port 3003)
cd demo_pages/microsoft && python3 -m http.server 3003
```
