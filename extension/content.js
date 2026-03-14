console.log("PhishGuard AI: Content script active (v1.7 - Hyper-Robust Whitelist)");

// Avoid double-inject + double-scan inside iframes.
if (window.top !== window.self) {
    console.log("PhishGuard AI: Skipping iframe context");
} else {

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function safeNumber(value, fallback = 0) {
        const num = typeof value === "number" ? value : Number(value);
        return Number.isFinite(num) ? num : fallback;
    }

    function normalizeScanResult(raw) {
        const result = raw && typeof raw === "object" ? raw : {};
        const combinedScore = safeNumber(result.combined_score ?? result.combinedScore ?? result.score, NaN);
        const riskLevelRaw = result.risk_level ?? result.riskLevel ?? result.risk ?? "UNKNOWN";
        const riskLevel = String(riskLevelRaw).toUpperCase();
        const layers = result.layers && typeof result.layers === "object" ? result.layers : {};

        return {
            ...result,
            combined_score: Number.isFinite(combinedScore) ? combinedScore : undefined,
            risk_level: riskLevel,
            layers
        };
    }

    const TRUSTED_ROOTS = [
        "google.com",
        "github.com",
        "apple.com",
        "microsoft.com",
        "office.com",
        "live.com",
        "outlook.com",
        "paypal.com",
        "whatsapp.com",
        "whatsapp.net",
        "facebook.com",
        "instagram.com",
        "linkedin.com",
        "twitter.com",
        "x.com",
        "amazon.com",
        "netflix.com",
        "discord.com",
        "slack.com",
        "googlevideo.com",
        "youtube.com",
        "ytimg.com",
        "web.whatsapp.com"
    ];

    function isTrustedHost(hostname) {
        if (!hostname) return false;
        let host = String(hostname).trim().toLowerCase();
        if (host.endsWith(".")) host = host.slice(0, -1);

        // Direct match or subdomain match
        return TRUSTED_ROOTS.some((root) => {
            const r = root.toLowerCase();
            return host === r || host.endsWith("." + r);
        });
    }

    function isIpHost(hostname) {
        const host = String(hostname || "").toLowerCase();
        // Check if it's an IP
        const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
        if (!isIp) return false;

        // Bypass local/private IPs from being "risky"
        const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" ||
            host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.");
        return !isLocal;
    }

    function isSuspiciousTld(hostname) {
        const host = String(hostname || "").toLowerCase();
        return [".xyz", ".top", ".tk", ".work", ".click", ".cam", ".zip"].some((tld) => host.endsWith(tld));
    }

    function isProbablyRiskyUrl(u) {
        try {
            const host = (u.hostname || "").toLowerCase();
            const path = (u.pathname || "").toLowerCase();
            const full = (u.href || "").toLowerCase();

            // If it's a known trusted domain, bypass the "risky" heuristics to avoid any interception.
            if (isTrustedHost(host)) return false;

            if (full.includes("@")) return true; // userinfo in URL is often used in phishing
            if (host.startsWith("xn--")) return true; // punycode
            if (isIpHost(host)) return true;
            if (isSuspiciousTld(host)) return true;

            const keywords = ["login", "signin", "sign-in", "verify", "secure", "account", "password", "auth", "update"];
            if (keywords.some((k) => path.includes(k))) {
                // Double check if it's a subdomain of a trusted root one last time
                if (isTrustedHost(host)) return false;
                return true;
            }

            // Brand baiting on non-official domains
            const brands = ["paypal", "google", "microsoft", "office", "outlook", "apple", "bank", "whatsapp"];
            if (brands.some((b) => host.includes(b))) {
                if (isTrustedHost(host)) return false;
                return true;
            }
            if (brands.some((b) => full.includes(b))) {
                if (isTrustedHost(host)) return false;
                return true;
            }

            return false;
        } catch {
            return true;
        }
    }

    function getDomSummary() {
        const title = document.title || "";
        const forms = Array.from(document.forms || []);
        const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
        const links = Array.from(document.querySelectorAll("a[href]"));

        const passwordInputs = inputs.filter((el) => (el.getAttribute("type") || "").toLowerCase() === "password");
        const emailInputs = inputs.filter((el) => (el.getAttribute("type") || "").toLowerCase() === "email");

        const externalLinkHosts = new Set();
        for (const a of links.slice(0, 200)) {
            try {
                const u = new URL(a.href, window.location.href);
                if (u.protocol === "http:" || u.protocol === "https:") externalLinkHosts.add(u.hostname);
            } catch { }
        }

        return {
            context_title: title.slice(0, 120),
            has_forms: forms.length > 0,
            form_count: forms.length,
            input_count: inputs.length,
            password_input_count: passwordInputs.length,
            email_input_count: emailInputs.length,
            external_link_hosts: Array.from(externalLinkHosts).slice(0, 25),
        };
    }

    function performInitialScan() {
        // Only scan real web pages
        if (location.protocol !== "http:" && location.protocol !== "https:") return;

        // For trusted domains, we still send a scan notification to the dashboard,
        // but we use a specialized sender type to avoid heavy overhead (like screenshots).
        const isTrusted = isTrustedHost(location.hostname);

        // Avoid re-scanning the same URL multiple times (SPA / bfcache / re-injection).
        const key = `phishguard_scanned:${location.href}`;
        if (sessionStorage.getItem(key) === "1") return;
        sessionStorage.setItem(key, "1");

        const pageData = {
            url: window.location.href,
            html_content: (document.documentElement?.outerHTML || "").substring(0, 5000),
            text_content: (document.body?.innerText || "").substring(0, 2000),
            dom_summary: isTrusted ? { context_title: document.title } : getDomSummary(),
            sender_info: isTrusted ? "Trusted Page View" : "Initial page load"
        };

        chrome.runtime.sendMessage({ action: "scanPage", data: pageData }, (response) => {
            if (response && response.status === "success") {
                // If it's a trusted host, we don't handle scan results (don't show overlays).
                if (!isTrusted) {
                    handleScanResult(response.result);
                }
            }
        });
    }

    // Trigger a scan on page load so warnings can appear without requiring a click.
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(performInitialScan, 600);
    } else {
        window.addEventListener("DOMContentLoaded", () => setTimeout(performInitialScan, 600), { once: true });
    }

    // 2. Global Link Interception
    document.addEventListener('click', (e) => {
        // Only intercept primary-click navigation (avoid breaking new-tab, selection, etc.)
        if (!e.isTrusted) return;
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        let target = e.target;
        while (target && target.tagName !== 'A') {
            target = target.parentElement;
        }
        const link = target;

        if (link && link.href && link.href.startsWith('http')) {
            const targetUrl = new URL(link.href);
            const host = targetUrl.hostname.toLowerCase();

            // HYPER-AGGRESSIVE BYPASS FOR WHATSAPP/TRUSTED DOMAINS
            // This prevents ANY PhishGuard code (loaders, intercepts) from running for these sites.
            if (host.includes("whatsapp.com") || host.includes("whatsapp.net") || isTrustedHost(host)) {
                console.log("PhishGuard: HYPER-BYPASS for trusted host:", host);
                // We still background-log for the dashboard, but we NEVER prevent default.
                chrome.runtime.sendMessage({
                    action: "scanPage",
                    data: {
                        url: link.href,
                        html_content: "",
                        text_content: "Direct bypass click (Trusted)",
                        dom_summary: { context_title: document.title },
                        sender_info: "Trusted Bypass"
                    }
                });
                return;
            }

            const offlineUntil = Number(sessionStorage.getItem("pg_offline_until") || "0");
            if (Date.now() < offlineUntil) return;

            // Don't interfere with explicit new-tab behaviors.
            const linkTarget = String(link.getAttribute("target") || "").toLowerCase();
            if (linkTarget === "_blank") return;
            if (link.hasAttribute("download")) return;

            const thisUrl = new URL(window.location.href);

            const isInterApp = (host !== thisUrl.hostname.toLowerCase()) || (targetUrl.port !== thisUrl.port);

            if (isInterApp) {
                const isRisky = isProbablyRiskyUrl(targetUrl);
                console.log("PhishGuard: Link Analysis for", host, "Risky:", isRisky);

                // Construct the scan payload
                const scanPayload = {
                    action: "scanPage",
                    data: {
                        url: link.href,
                        html_content: "",
                        text_content: "Link click: " + document.body.innerText.substring(0, 500),
                        dom_summary: { context_title: document.title },
                        sender_info: isRisky ? "Global Intercept" : "Safe Link Click"
                    }
                };

                if (!isRisky) {
                    chrome.runtime.sendMessage(scanPayload);
                    return;
                }

                e.preventDefault();
                // Stop propagation only when we are intentionally overriding navigation.
                e.stopPropagation();

                showMiniLoader();

                const safetyTimeout = setTimeout(() => {
                    removeMiniLoader();
                    // Don't trap users forever if backend is offline; allow navigation for this session.
                    sessionStorage.setItem("pg_offline_until", String(Date.now() + 60_000));
                    window.location.href = link.href;
                }, 12000);

                chrome.runtime.sendMessage(scanPayload, (response) => {
                    clearTimeout(safetyTimeout);
                    removeMiniLoader();

                    if (response && response.status === "success") {
                        const res = normalizeScanResult(response.result);
                        sessionStorage.removeItem("pg_offline_until");
                        if (res.risk_level === "PHISHING" || res.risk_level === "SUSPICIOUS") {
                            showWarningOverlay(res, link.href);
                        } else {
                            window.location.href = link.href;
                        }
                    } else {
                        const message = response?.message ? String(response.message) : "No response from background scan.";
                        if (/(timed out|unreachable|failed to fetch|no response|aborted)/i.test(message)) {
                            sessionStorage.setItem("pg_offline_until", String(Date.now() + 60_000));
                            window.location.href = link.href;
                        } else {
                            showFailClosedOverlay({ targetUrl: link.href, reason: message });
                        }
                    }
                });
            }
        }
    }, true);

    function handleScanResult(result) {
        const res = normalizeScanResult(result);
        if (res.risk_level === "PHISHING" || res.risk_level === "SUSPICIOUS") {
            showWarningOverlay(res);
        }
    }

    function showMiniLoader() {
        if (document.getElementById("pg-mini-loader")) return;
        const loader = document.createElement("div");
        loader.id = "pg-mini-loader";
        loader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div id="pg-spinner"></div>
            <span style="color: white; font-weight: 700;">🛡️ PhishGuard Analyzing Link...</span>
        </div>
        <style>
            #pg-spinner {
                width: 18px; height: 18px;
                border: 3px solid rgba(255,255,255,0.2);
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: pg-spin 0.7s linear infinite;
            }
            @keyframes pg-spin { to { transform: rotate(360deg); } }
        </style>
    `;
        loader.style.cssText = `
        position: fixed; bottom: 30px; right: 30px;
        background: #0f172a; padding: 14px 24px;
        border-radius: 12px; z-index: 2147483647;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
        border: 2px solid #3b82f6;
    `;
        document.body.appendChild(loader);
    }

    function removeMiniLoader() {
        const l = document.getElementById("pg-mini-loader");
        if (l) l.remove();
    }

    function showWarningOverlay(result, targetUrl = null) {
        const existing = document.getElementById("phishguard-warning-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "phishguard-warning-overlay";
        overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.95); z-index: 2147483647;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(8px); padding: 20px; box-sizing: border-box;
    `;

        let displayUrl = window.location.host;
        if (targetUrl) {
            try {
                const u = new URL(targetUrl);
                displayUrl = u.hostname + (u.port ? ":" + u.port : "");
            } catch {
                displayUrl = String(targetUrl);
            }
        }
        const combinedScore = safeNumber(result.combined_score, NaN);
        const scoreText = Number.isFinite(combinedScore) ? `${combinedScore.toFixed(0)}%` : "N/A";

        const linguisticDetails = escapeHtml(result?.layers?.linguistic?.details ?? "No linguistic details.");
        const visualDetails = escapeHtml(result?.layers?.visual?.details ?? "No visual details.");
        const behavioralDetails = escapeHtml(result?.layers?.behavioral?.details ?? "No behavioral details.");

        overlay.innerHTML = `
        <div style="max-width: 580px; background: white; color: #1e293b; padding: 40px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,1); text-align: center; border: 1px solid #e2e8f0; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 10px; background: #dc2626; border-radius: 20px 20px 0 0;"></div>
            
            <div style="background: #fee2e2; width: 80px; height: 80px; border-radius: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                <svg style="width: 44px; height: 44px; color: #dc2626;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>

            <h1 style="font-size: 2.25rem; font-weight: 800; color: #991b1b; margin: 0 0 12px 0; letter-spacing: -0.025em;">BLOCKING THREAT</h1>
            <p style="font-size: 1.125rem; color: #475569; margin-bottom: 24px;">
                PhishGuard AI intercepted a <b>${escapeHtml(result.risk_level)}</b> risk request.<br>
                To: <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 600; color: #0f172a;">${escapeHtml(displayUrl)}</span>
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: left;">
                <div style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px; display: flex; justify-content: space-between;">
                    <span>AI Forensic Insight</span>
                    <span style="color: #dc2626;">Risk Score: ${scoreText}</span>
                </div>
                <div style="display: grid; gap: 12px;">
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 4px;">Linguistic</div>
                        <div style="font-size: 0.9rem; color: #334155; line-height: 1.45;">${linguisticDetails}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 4px;">Visual</div>
                        <div style="font-size: 0.9rem; color: #334155; line-height: 1.45;">${visualDetails}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 4px;">Behavioral</div>
                        <div style="font-size: 0.9rem; color: #334155; line-height: 1.45;">${behavioralDetails}</div>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 16px; justify-content: center;">
                <button id="pg-ignore" style="padding: 14px 24px; border: 2px solid #e2e8f0; border-radius: 10px; background: white; font-weight: 700; cursor: pointer; color: #64748b; font-size: 15px;">Ignore Risk</button>
                <button id="pg-escape" style="padding: 14px 32px; background: #dc2626; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(220, 38, 38, 0.4);">Safely Exit</button>
            </div>
        </div>
    `;

        document.body.appendChild(overlay);
        document.body.style.overflow = "hidden";

        document.getElementById("pg-escape").onclick = () => {
            if (targetUrl) {
                overlay.remove();
                document.body.style.overflow = "auto";
            } else {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = "https://www.google.com";
                }
            }
        };

        document.getElementById("pg-ignore").onclick = () => {
            if (targetUrl) window.location.href = targetUrl;
            overlay.remove();
            document.body.style.overflow = "auto";
        };
    }

    function showFailClosedOverlay({ targetUrl, reason }) {
        const existing = document.getElementById("phishguard-warning-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "phishguard-warning-overlay";
        overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.95); z-index: 2147483647;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(8px); padding: 20px; box-sizing: border-box;
    `;

        let displayUrl = String(targetUrl ?? "");
        if (targetUrl) {
            try {
                const u = new URL(targetUrl);
                displayUrl = u.hostname + (u.port ? ":" + u.port : "");
            } catch { }
        }

        overlay.innerHTML = `
        <div style="max-width: 580px; background: white; color: #1e293b; padding: 40px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,1); text-align: center; border: 1px solid #e2e8f0; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 10px; background: #f59e0b; border-radius: 20px 20px 0 0;"></div>

            <div style="background: #ffedd5; width: 80px; height: 80px; border-radius: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                <svg style="width: 44px; height: 44px; color: #f59e0b;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>

            <h1 style="font-size: 2.0rem; font-weight: 800; color: #9a3412; margin: 0 0 12px 0; letter-spacing: -0.025em;">UNVERIFIED LINK</h1>
            <p style="font-size: 1.05rem; color: #475569; margin-bottom: 18px;">
                PhishGuard couldn’t analyze this request.<br>
                To: <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 600; color: #0f172a;">${escapeHtml(displayUrl)}</span>
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 24px; text-align: left;">
                <div style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Reason</div>
                <div style="font-size: 0.9rem; color: #334155; line-height: 1.45;">${escapeHtml(reason || "Unknown error")}</div>
            </div>

            <div style="display: flex; gap: 16px; justify-content: center;">
                <button id="pg-proceed" style="padding: 14px 24px; border: 2px solid #e2e8f0; border-radius: 10px; background: white; font-weight: 700; cursor: pointer; color: #64748b; font-size: 15px;">Proceed Anyway</button>
                <button id="pg-exit" style="padding: 14px 32px; background: #0f172a; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(15, 23, 42, 0.35);">Exit</button>
            </div>
        </div>
    `;

        document.body.appendChild(overlay);
        document.body.style.overflow = "hidden";

        document.getElementById("pg-exit").onclick = () => {
            if (targetUrl) {
                overlay.remove();
                document.body.style.overflow = "auto";
            } else {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = "https://www.google.com";
                }
            }
        };
        document.getElementById("pg-proceed").onclick = () => {
            if (targetUrl) window.location.href = targetUrl;
            overlay.remove();
            document.body.style.overflow = "auto";
        };
    }

}
