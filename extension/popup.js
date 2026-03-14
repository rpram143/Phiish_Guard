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
    let raw = String(inputValue || "").trim();
    if (!raw) return DEFAULT_API_URL;

    try {
        // Add protocol if missing
        if (!raw.startsWith('http')) {
            raw = 'http://' + raw;
        }

        const u = new URL(raw);
        // If the path is just / or empty, append the full path
        if (u.pathname === "/" || u.pathname === "") {
            u.pathname = "/api/v1/scan";
        }

        // Ensure no trailing slashes
        return u.toString().replace(/\/+$/, "");
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
    const protectionTitle = document.getElementById("protection-status");
    const iconWrapper = document.querySelector(".shield-icon-wrapper");

    if (!label || !badge) return;

    label.textContent = text;

    if (kind === "risk") {
        badge.style.background = "rgba(239, 68, 68, 0.1)";
        badge.style.borderColor = "rgba(239, 68, 68, 0.2)";
        label.style.color = "var(--danger)";
        if (dot) {
            dot.style.background = "var(--danger)";
            dot.style.boxShadow = "0 0 12px var(--danger)";
        }
        if (protectionTitle) {
            protectionTitle.textContent = "Threat Detected";
            protectionTitle.style.color = "var(--danger)";
        }
        if (iconWrapper) {
            iconWrapper.style.background = "rgba(239, 68, 68, 0.1)";
            iconWrapper.style.color = "var(--danger)";
        }
    } else if (kind === "warning") {
        badge.style.background = "rgba(245, 158, 11, 0.1)";
        badge.style.borderColor = "rgba(245, 158, 11, 0.2)";
        label.style.color = "var(--warning)";
        if (dot) {
            dot.style.background = "var(--warning)";
            dot.style.boxShadow = "0 0 12px var(--warning)";
        }
        if (protectionTitle) {
            protectionTitle.textContent = "Potential Risk";
            protectionTitle.style.color = "var(--warning)";
        }
    } else {
        badge.style.background = "rgba(16, 185, 129, 0.1)";
        badge.style.borderColor = "rgba(16, 185, 129, 0.2)";
        label.style.color = "var(--success)";
        if (dot) {
            dot.style.background = "var(--success)";
            dot.style.boxShadow = "0 0 12px var(--success)";
        }
        if (protectionTitle) {
            protectionTitle.textContent = "Secured Domain";
            protectionTitle.style.color = "white";
        }
        if (iconWrapper) {
            iconWrapper.style.background = "rgba(16, 185, 129, 0.1)";
            iconWrapper.style.color = "var(--success)";
        }
    }
}

function updateStats() {
    chrome.storage.local.get(["scannedCount", "blockedCount", "lastScanUrl"], (res) => {
        const scannedEl = document.getElementById("stat-scanned");
        const blockedEl = document.getElementById("stat-blocked");
        const urlDescEl = document.getElementById("last-scan-url");

        if (scannedEl) scannedEl.textContent = res.scannedCount >= 1000 ? (res.scannedCount / 1000).toFixed(1) + 'k' : (res.scannedCount || 0);
        if (blockedEl) blockedEl.textContent = res.blockedCount || 0;

        if (urlDescEl && res.lastScanUrl) {
            try {
                const domain = new URL(res.lastScanUrl).hostname;
                urlDescEl.textContent = `${domain} is currently safe from threats`;
            } catch {
                urlDescEl.textContent = res.lastScanUrl;
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("api-url");
    const saveButton = document.getElementById("save-api-url");
    const testButton = document.getElementById("test-api-url");
    const dashboardButton = document.getElementById("open-dashboard");
    const rescanButton = document.getElementById("rescan-btn");

    chrome.storage.sync.get(["apiUrl"], (res) => {
        const apiUrl = res?.apiUrl || DEFAULT_API_URL;
        if (input) input.value = apiUrl;
    });

    updateStats();
    setInterval(updateStats, 2000);

    dashboardButton?.addEventListener("click", () => {
        chrome.tabs.create({ url: "http://localhost:5173" });
    });

    rescanButton?.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "triggerManualScan" });
                setStatus("SCANNING", "warning");
                setTimeout(() => setStatus("ACTIVE", "safe"), 3000);
            }
        });
    });

    saveButton?.addEventListener("click", () => {
        const next = normalizeApiUrl(input?.value);
        chrome.runtime.sendMessage({ action: "updateApiUrl", url: next }, (response) => {
            if (response && response.status === "success") {
                if (input) input.value = next;
                setStatus("UPDATED", "safe");
                setTimeout(() => setStatus("ACTIVE", "safe"), 2000);
            } else {
                setStatus("ERROR", "risk");
            }
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

            const res = await fetch(`${healthUrl}?t=${Date.now()}`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                setStatus("ONLINE", "safe");
                setTimeout(() => setStatus("ACTIVE", "safe"), 3000);
            } else {
                setStatus(`OFFLINE`, "risk");
            }
        } catch (e) {
            setStatus("ABORTED", "risk");
        }
    });
});
