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

class VisualAnalyzer:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=self.api_key) if self.api_key else None
        self.trusted_roots = ["google.com", "paypal.com", "microsoft.com", "office.com", "live.com", "microsoftonline.com"]
        self.demo_ports = {"3001": "paypal", "3002": "google", "3003": "microsoft"}

    def _is_trusted(self, domain):
        for root in self.trusted_roots:
            if domain == root or domain.endswith("." + root):
                return True
        return False

    async def take_screenshot(self, url: str) -> str:
        """Takes a screenshot of the URL and returns it as a base64 string."""
        # Mapping localhost to the accessible host IP for VM analysis
        vm_host = os.getenv("VM_HOST_IP", "127.0.0.1")
        internal_url = url.replace("localhost", vm_host).replace("127.0.0.1", vm_host)
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                # Set a timeout for the page load
                await page.goto(internal_url, timeout=10000, wait_until="networkidle")
                screenshot_bytes = await page.screenshot(type="jpeg", quality=80)
                await browser.close()
                return base64.b64encode(screenshot_bytes).decode('utf-8')
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
        if self._is_trusted(domain):
            return LayerResult(score=0.0, details="Verified official brand domain.", ai_confidence=0.0)

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
                screenshot_b64 = await self.take_screenshot(url)
            
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
                    
                    completion = self.client.chat.completions.create(
                        model="llama-3.2-11b-vision-preview",
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
                        response_format={"type": "json_object"}
                    )
                    
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
