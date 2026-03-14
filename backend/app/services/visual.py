import cv2
import numpy as np
import imagehash
from PIL import Image
import io
import base64
import os
from app.models.schemas import LayerResult
from urllib.parse import urlparse
import Levenshtein
import re
from playwright.async_api import async_playwright
from groq import Groq
from dotenv import load_dotenv
from typing import Optional
import asyncio

class VisualAnalyzer:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=self.api_key) if self.api_key else None
        self.trusted_roots = [
            "google.com", "github.com", "apple.com", "microsoft.com", 
            "office.com", "live.com", "outlook.com", "microsoftonline.com",
            "paypal.com", "whatsapp.com", "whatsapp.net", "facebook.com", "instagram.com", 
            "linkedin.com", "twitter.com", "x.com", "amazon.com", 
            "netflix.com", "discord.com", "slack.com", "googlevideo.com", "youtube.com", "ytimg.com",
            "brave.com", "bing.com", "duckduckgo.com", "google.co.in", "yahoo.com"
        ]
        self.demo_ports = {"3001": "paypal", "3002": "google", "3003": "microsoft"}

    def _is_trusted(self, domain, port=None):
        domain = domain.lower().rstrip('.')
        
        # Whitelist localhost and private IPs unless on specific demo phishing ports
        demo_ports = ["3001", "3002", "3003"]
        is_local = domain in ["localhost", "127.0.0.1", "::1"] or \
                   domain.startswith("192.168.") or domain.startswith("10.") or \
                   domain.startswith("172.")
                   
        if is_local:
            if port and str(port) in demo_ports:
                return False # Local but on a phishing demo port
            return True

        for root in self.trusted_roots:
            if domain == root or domain.endswith("." + root):
                return True
        return False

    async def take_screenshot(self, url: str) -> Optional[str]:
        """Takes a screenshot of the URL and returns it as a base64 string (or None)."""
        # Mapping localhost to the accessible host IP for VM analysis
        vm_host = os.getenv("VM_HOST_IP", "127.0.0.1")
        internal_url = url.replace("localhost", vm_host).replace("127.0.0.1", vm_host)
        
        # Arch Linux Support: Check for system chromium
        executable_path = None
        if os.path.exists("/usr/bin/chromium"):
            executable_path = "/usr/bin/chromium"
        elif os.path.exists("/usr/bin/google-chrome"):
            executable_path = "/usr/bin/google-chrome"

        try:
            async with async_playwright() as p:
                launch_kwargs = {"headless": True}
                if executable_path:
                    launch_kwargs["executable_path"] = executable_path

                # Some real websites never reach "networkidle" due to long-polling/websockets.
                # We prefer a quicker, more reliable "domcontentloaded" + short settle.
                browser = await p.chromium.launch(**launch_kwargs)
                try:
                    context = await browser.new_context(
                        viewport={"width": 1280, "height": 720},
                        locale="en-US",
                        user_agent=(
                            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                            "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                        ),
                    )
                    page = await context.new_page()
                    page.set_default_timeout(15000)

                    await page.goto(internal_url, timeout=20000, wait_until="domcontentloaded")
                    try:
                        await page.wait_for_load_state("networkidle", timeout=5000)
                    except Exception:
                        pass

                    # Best-effort cookie/modal cleanup to get a usable screenshot.
                    try:
                        await page.keyboard.press("Escape")
                    except Exception:
                        pass

                    try:
                        await page.evaluate(
                            """() => {
                                const vw = window.innerWidth || 0;
                                const vh = window.innerHeight || 0;
                                const overlayMinArea = vw * vh * 0.30;

                                const hide = (el) => {
                                    try {
                                        el.style.setProperty("display", "none", "important");
                                        el.style.setProperty("visibility", "hidden", "important");
                                    } catch {}
                                };

                                // Hide common consent/cookie banners
                                const cookieSelectors = [
                                    '[id*="cookie" i]', '[class*="cookie" i]', '[aria-label*="cookie" i]',
                                    '[id*="consent" i]', '[class*="consent" i]', '[aria-label*="consent" i]',
                                    '[id*="gdpr" i]', '[class*="gdpr" i]'
                                ];
                                for (const sel of cookieSelectors) {
                                    for (const el of document.querySelectorAll(sel)) {
                                        const cs = window.getComputedStyle(el);
                                        const pos = cs.position;
                                        if (pos !== "fixed" && pos !== "sticky") continue;
                                        hide(el);
                                    }
                                }

                                // Hide large fixed/sticky overlays (modals, interstitials)
                                const all = Array.from(document.querySelectorAll("body *"));
                                for (const el of all) {
                                    const cs = window.getComputedStyle(el);
                                    const pos = cs.position;
                                    if (pos !== "fixed" && pos !== "sticky") continue;
                                    const zi = Number.parseInt(cs.zIndex || "0", 10);
                                    if (!Number.isFinite(zi) || zi < 2000) continue;
                                    const r = el.getBoundingClientRect();
                                    const area = Math.max(0, r.width) * Math.max(0, r.height);
                                    if (area < overlayMinArea) continue;
                                    hide(el);
                                }
                            }"""
                        )
                    except Exception:
                        pass

                    screenshot_bytes = await page.screenshot(type="jpeg", quality=80)
                    return base64.b64encode(screenshot_bytes).decode("utf-8")
                finally:
                    await browser.close()
        except Exception as e:
            print(f"Playwright Screenshot Error (URL: {internal_url}): {e}")
            return None

    async def analyze(self, url: str, screenshot_b64: str = None) -> LayerResult:
        # Mapping localhost to the accessible host IP for analysis
        vm_host = os.getenv("VM_HOST_IP", "127.0.0.1")
        internal_url = url.replace("localhost", vm_host).replace("127.0.0.1", vm_host)
        score = 0.0
        details = []
        ai_confidence = 0.0
        
        parsed_url = urlparse(internal_url)
        domain = parsed_url.netloc.lower().split(':')[0]
        port = str(parsed_url.port) if parsed_url.port else ""
        
        # 0. Whitelist Check
        if self._is_trusted(domain, port):
            return LayerResult(score=0.0, details="Verified official/local domain.", ai_confidence=0.0)

        # 1. Demo Port Detection (Fast path)
        if port in self.demo_ports:
            brand = self.demo_ports[port]
            score = 95.0
            details.append(f"SIGNATURE MATCH: Fake {brand.upper()} login page detected (Port {port})")
            # We still proceed to Vision LLM for verification if possible
        
        # 2. Typosquatting/Heuristics
        brands = ["paypal", "google", "microsoft"]
        for brand in brands:
            if brand in domain and not self._is_trusted(domain):
                score = max(score, 70.0)
                details.append(f"Visual Heuristic: Domain contains brand name '{brand}' but is not official.")

        # 3. Vision LLM Analysis
        if self.client:
            # If no screenshot provided, try to take one
            if not screenshot_b64:
                if os.getenv("PHISHGUARD_DISABLE_PLAYWRIGHT", "0") == "1":
                    details.append("Visual: Screenshot not provided (Playwright disabled).")
                else:
                    screenshot_b64 = await self.take_screenshot(url)
                    if not screenshot_b64:
                        details.append("Visual: Screenshot capture failed (skipping vision model).")
            
            if screenshot_b64:
                try:
                    prompt = f"""
                    SYSTEM: Phishing Vision Analyst. 
                    Analyze this screenshot of the website: {url}
                    Does this page look like it is impersonating a major brand (PayPal, Google, Microsoft, etc.)?
                    Compare the visual elements (logos, colors, layout) against official brand assets.
                    
                    Return JSON:
                    {{
                        "is_impersonation": bool,
                        "detected_brand": "Brand Name or None",
                        "visual_score": float (0-100),
                        "confidence": float (0-100),
                        "reasoning": "string"
                    }}
                    """

                    def do_request():
                        return self.client.chat.completions.create(
                            model="meta-llama/llama-4-scout-17b-16e-instruct",
                            messages=[
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": prompt},
                                        {
                                            "type": "image_url",
                                            "image_url": {
                                                "url": f"data:image/jpeg;base64,{screenshot_b64}",
                                            },
                                        },
                                    ],
                                }
                            ],
                            response_format={"type": "json_object"},
                        )

                    completion = await asyncio.wait_for(asyncio.to_thread(do_request), timeout=9)
                    
                    import json
                    v_res = json.loads(completion.choices[0].message.content)
                    
                    if v_res.get("is_impersonation"):
                        score = max(score, v_res.get("visual_score", 0))
                        details.append(f"VISION AI: Detected {v_res.get('detected_brand')} impersonation. {v_res.get('reasoning')}")
                        ai_confidence = v_res.get("confidence", 0)
                    else:
                        ai_confidence = v_res.get("confidence", 0)
                        if score < 50: # If heuristics didn't catch much
                            score = max(score, v_res.get("visual_score", 0) / 2) # Trust AI if it says it's safe

                except Exception as e:
                    print(f"Vision LLM Error: {e}")
                    details.append(f"Vision analysis failed: {str(e)}")

        return LayerResult(
            score=min(score, 100),
            details=" | ".join(details) if details else "No visual threats detected",
            ai_confidence=ai_confidence
        )
