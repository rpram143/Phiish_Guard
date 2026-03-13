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
    const el = document.getElementById("status-box");
    const pulseRing = document.querySelector(".pulse-ring");
    const pulseDot = document.querySelector(".pulse-dot");
    
    if (!el) return;
    el.textContent = text;
    el.classList.remove("risk");
    
    if (kind === "risk") {
        el.classList.add("risk");
        if (pulseRing) pulseRing.style.borderColor = "var(--danger)";
        if (pulseDot) pulseDot.style.background = "var(--danger)";
    } else {
        if (pulseRing) pulseRing.style.borderColor = "var(--success)";
        if (pulseDot) pulseDot.style.background = "var(--success)";
    }
}

function updateStats() {
    chrome.storage.local.get(["scannedCount", "blockedCount"], (res) => {
        document.getElementById("stat-scanned").textContent = res.scannedCount || 0;
        document.getElementById("stat-blocked").textContent = res.blockedCount || 0;
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
    // Refresh stats every second while popup is open
    setInterval(updateStats, 1000);

    dashboardButton?.addEventListener("click", () => {
        chrome.tabs.create({ url: "http://localhost:5173" });
    });

    saveButton?.addEventListener("click", () => {
        const next = normalizeApiUrl(input?.value);
        chrome.storage.sync.set({ apiUrl: next }, () => {
            if (display) display.textContent = getDisplayHost(next);
            if (input) input.value = next;
            setStatus("Settings Updated", "safe");
            setTimeout(() => setStatus("Active & Shielded", "safe"), 2000);
        });
    });

    testButton?.addEventListener("click", async () => {
        const next = normalizeApiUrl(input?.value);
        const healthUrl = getHealthUrl(next);
        if (!healthUrl) {
            setStatus("Invalid URL format", "risk");
            return;
        }

        setStatus("Connecting...", "safe");
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(healthUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                setStatus("System Online ✅", "safe");
                setTimeout(() => setStatus("Active & Shielded", "safe"), 3000);
            } else {
                setStatus(`Offline (${res.status})`, "risk");
            }
        } catch (e) {
            setStatus("Backend Unreachable", "risk");
        }
    });
});
