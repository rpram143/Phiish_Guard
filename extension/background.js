const DEFAULT_API_URL = "http://localhost:8000/api/v1/scan";

function isPrivateOrLocalHost(hostname) {
    if (!hostname) return false;
    const h = String(hostname).toLowerCase();
    if (h === "localhost") return true;
    if (h.startsWith("127.")) return true;

    // Very small/safe heuristic: only treat RFC1918 IPv4 as local.
    const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return false;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (![a, b, Number(m[3]), Number(m[4])].every(n => Number.isFinite(n) && n >= 0 && n <= 255)) return false;
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
}

function deriveDefaultApiUrl(senderUrl) {
    try {
        const u = new URL(String(senderUrl || ""));
        const host = u.hostname;
        if (isPrivateOrLocalHost(host)) return `http://${host}:8000/api/v1/scan`;
    } catch { }
    return DEFAULT_API_URL;
}

async function getApiUrl(senderUrl) {
    return await new Promise((resolve) => {
        try {
            chrome.storage.sync.get(["apiUrl"], (res) => {
                resolve(res?.apiUrl || deriveDefaultApiUrl(senderUrl));
            });
        } catch {
            resolve(deriveDefaultApiUrl(senderUrl));
        }
    });
}

function updateStats(isBlocked) {
    chrome.storage.local.get(["scannedCount", "blockedCount"], (res) => {
        const scannedCount = (res.scannedCount || 0) + 1;
        const blockedCount = (res.blockedCount || 0) + (isBlocked ? 1 : 0);
        chrome.storage.local.set({ scannedCount, blockedCount });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanPage") {
        let scanData = request.data;
        const senderUrl = sender?.tab?.url;
        
        // If it's an initial page load, we can capture a screenshot from the extension
        if (scanData.sender_info === "Initial page load" && sender.tab) {
            chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "jpeg", quality: 50 }, (dataUrl) => {
                if (dataUrl) {
                    scanData.screenshot = dataUrl.split(",")[1]; // Send just the base64 part
                }
                
                scanPage(scanData, senderUrl)
                    .then(result => {
                        const isBlocked = result.risk_level === "PHISHING" || result.risk_level === "SUSPICIOUS";
                        updateStats(isBlocked);
                        sendResponse({ status: "success", result: result });
                    })
                    .catch(error => {
                        sendResponse({ status: "error", message: error.message });
                    });
            });
            return true; // Keep message channel open for async response
        }

        scanPage(scanData, senderUrl)
            .then(result => {
                const isBlocked = result.risk_level === "PHISHING" || result.risk_level === "SUSPICIOUS";
                updateStats(isBlocked);
                sendResponse({ status: "success", result: result });
            })
            .catch(error => {
                sendResponse({ status: "error", message: error.message });
            });

        return true; 
    }
});

async function scanPage(data, senderUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for AI analysis

    try {
        const apiUrl = await getApiUrl(senderUrl);
        console.log(`PhishGuard: Sending scan request to ${apiUrl} for ${data.url}`);
        
        const response = await fetch(apiUrl, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`PhishGuard: Backend returned ${response.status}`);
            throw new Error(`HTTP Error ${response.status}`);
        }

        const result = await response.json();
        console.log(`PhishGuard: Scan complete for ${data.url}. Risk: ${result.risk_level}`);

        try {
            const score = Math.round(result.combined_score || 0).toString();
            const color = result.combined_score > 70 ? "#DC2626" : (result.combined_score > 30 ? "#F59E0B" : "#10B981");
            chrome.action.setBadgeText({ text: score });
            chrome.action.setBadgeBackgroundColor({ color: color });
        } catch (badgeError) {}

        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
