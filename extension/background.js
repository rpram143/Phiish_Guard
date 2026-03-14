const DEFAULT_API_URL = "http://localhost:8000/api/v1/scan";

async function getApiUrl() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(["apiUrl"], (res) => {
            resolve(res.apiUrl || DEFAULT_API_URL);
        });
    });
}

function updateStats(isBlocked, lastScanUrl) {
    chrome.storage.local.get(["scannedCount", "blockedCount", "lastScanUrl"], (res) => {
        const scannedCount = (res.scannedCount || 0) + 1;
        const blockedCount = (res.blockedCount || 0) + (isBlocked ? 1 : 0);
        chrome.storage.local.set({
            scannedCount,
            blockedCount,
            lastScanUrl: lastScanUrl || res.lastScanUrl || ""
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanPage") {
        let scanData = request.data;
        const senderUrl = sender?.tab?.url;
        const tabId = sender?.tab?.id;

        if (scanData.sender_info === "Initial page load" && sender.tab) {
            chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "jpeg", quality: 50 }, (dataUrl) => {
                if (dataUrl) {
                    scanData.screenshot = dataUrl.split(",")[1];
                }
                
                scanPage(scanData, senderUrl, tabId)
                    .then(result => {
                        const isBlocked = result.risk_level === "PHISHING" || result.risk_level === "SUSPICIOUS";
                        updateStats(isBlocked, scanData?.url);
                        sendResponse({ status: "success", result: result });
                    })
                    .catch(error => {
                        sendResponse({ status: "error", message: error.message });
                    });
            });
            return true;
        }

        scanPage(scanData, senderUrl, tabId)
            .then(result => {
                const isBlocked = result.risk_level === "PHISHING" || result.risk_level === "SUSPICIOUS";
                updateStats(isBlocked, scanData?.url);
                sendResponse({ status: "success", result: result });
            })
            .catch(error => {
                sendResponse({ status: "error", message: error.message });
            });

        return true;
    } else if (request.action === "updateApiUrl") {
        const newUrl = request.url;
        chrome.storage.sync.set({ apiUrl: newUrl }, () => {
            console.log(`PhishGuard: API URL updated to ${newUrl}`);
            sendResponse({ status: "success" });
        });
        return true;
    }
});

async function scanPage(data, senderUrl, tabId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const apiUrl = await getApiUrl();
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
            if (Number.isInteger(tabId)) {
                chrome.action.setBadgeText({ tabId, text: score });
                chrome.action.setBadgeBackgroundColor({ tabId, color });
            } else {
                chrome.action.setBadgeText({ text: score });
                chrome.action.setBadgeBackgroundColor({ color });
            }
        } catch (badgeError) {}

        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error?.name === "AbortError") {
            throw new Error("Scan timed out (backend took too long or is unreachable)");
        }
        throw error;
    }
}
