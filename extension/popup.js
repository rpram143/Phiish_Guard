const DEFAULT_API_URL = "http://localhost:8000/api/v1/scan";

function getDisplayHost(apiUrl) {
    try {
        const u = new URL(apiUrl);
        return u.hostname + (u.port ? `:${u.port}` : "");
    } catch {
        return apiUrl;
    }
}

function normalizeApiUrl(inputValue) {
    const raw = String(inputValue || "").trim();
    if (!raw) return DEFAULT_API_URL;

    try {
        const u = new URL(raw.startsWith('http') ? raw : 'http://' + raw);
        const normalized = new URL(u.toString());
        const path = normalized.pathname.replace(/\/+$/, "");
        if (path !== "/api/v1/scan") {
            normalized.pathname = "/api/v1/scan";
            normalized.search = "";
            normalized.hash = "";
        }
        return normalized.toString();
    } catch {
        return DEFAULT_API_URL;
    }
}

function getHealthUrl(scanUrl) {
    try {
        const u = new URL(scanUrl);
        u.pathname = "/api/v1/health";
        u.search = "";
        u.hash = "";
        return u.toString();
    } catch {
        return null;
    }
}

function setStatus(text, kind) {
    const label = document.getElementById("status-label");
    const badge = document.getElementById("status-badge");
    const dot = badge?.querySelector(".status-dot");
    const protectionText = document.getElementById("protection-status");
    
    if (!label || !badge) return;
    
    label.textContent = text;
    
    if (kind === "risk") {
        badge.style.background = "rgba(239, 68, 68, 0.1)";
        badge.style.borderColor = "rgba(239, 68, 68, 0.2)";
        label.style.color = "var(--danger)";
        if (dot) {
            dot.style.background = "var(--danger)";
            dot.style.boxShadow = "0 0 8px var(--danger)";
        }
        if (protectionText) protectionText.style.color = "var(--danger)";
    } else if (kind === "warning") {
        badge.style.background = "rgba(245, 158, 11, 0.1)";
        badge.style.borderColor = "rgba(245, 158, 11, 0.2)";
        label.style.color = "var(--warning)";
        if (dot) {
            dot.style.background = "var(--warning)";
            dot.style.boxShadow = "0 0 8px var(--warning)";
        }
    } else {
        badge.style.background = "rgba(16, 185, 129, 0.1)";
        badge.style.borderColor = "rgba(16, 185, 129, 0.2)";
        label.style.color = "var(--success)";
        if (dot) {
            dot.style.background = "var(--success)";
            dot.style.boxShadow = "0 0 8px var(--success)";
        }
        if (protectionText) protectionText.style.color = "var(--text)";
    }
}

function updateStats() {
    chrome.storage.local.get(["scannedCount", "blockedCount", "lastScanUrl"], (res) => {
        const scannedEl = document.getElementById("stat-scanned");
        const blockedEl = document.getElementById("stat-blocked");
        const urlEl = document.getElementById("last-scan-url");

        if (scannedEl) scannedEl.textContent = res.scannedCount || 0;
        if (blockedEl) blockedEl.textContent = res.blockedCount || 0;
        if (urlEl && res.lastScanUrl) {
            try {
                const domain = new URL(res.lastScanUrl).hostname;
                urlEl.textContent = `Last: ${domain}`;
            } catch {
                urlEl.textContent = res.lastScanUrl;
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("api-url");
    const display = document.getElementById("api-url-display");
    const saveButton = document.getElementById("save-api-url");
    const testButton = document.getElementById("test-api-url");
    const dashboardButton = document.getElementById("open-dashboard");

    chrome.storage.sync.get(["apiUrl"], (res) => {
        const apiUrl = res?.apiUrl || DEFAULT_API_URL;
        if (input) input.value = apiUrl;
        if (display) display.textContent = getDisplayHost(apiUrl);
    });

    updateStats();
    setInterval(updateStats, 1000);

    dashboardButton?.addEventListener("click", () => {
        chrome.tabs.create({ url: "http://localhost:5173" });
    });

    saveButton?.addEventListener("click", () => {
        const next = normalizeApiUrl(input?.value);
        chrome.storage.sync.set({ apiUrl: next }, () => {
            if (display) display.textContent = getDisplayHost(next);
            if (input) input.value = next;
            setStatus("UPDATED", "safe");
            setTimeout(() => setStatus("SECURED", "safe"), 2000);
        });
    });

    testButton?.addEventListener("click", async () => {
        const next = normalizeApiUrl(input?.value);
        const healthUrl = getHealthUrl(next);
        if (!healthUrl) {
            setStatus("INVALID", "risk");
            return;
        }

        setStatus("TESTING", "warning");
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(healthUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                setStatus("ONLINE", "safe");
                setTimeout(() => setStatus("SECURED", "safe"), 3000);
            } else {
                setStatus("OFFLINE", "risk");
            }
        } catch (e) {
            setStatus("ERROR", "risk");
        }
    });
});
