import os
from groq import Groq
from app.models.schemas import LayerResult
from urllib.parse import urlparse
from dotenv import load_dotenv

class LinguisticAnalyzer:
    def __init__(self):
        load_dotenv() # Ensure env is loaded even if imported early
        self.api_key = os.getenv("GROQ_API_KEY")
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None
        
        # White-listed base domains
        self.trusted_roots = ["google.com", "paypal.com", "microsoft.com", "office.com", "live.com", "microsoftonline.com"]

    def _is_trusted(self, domain):
        for root in self.trusted_roots:
            if domain == root or domain.endswith("." + root):
                return True
        return False

    async def analyze(self, url: str, html: str, text: str) -> LayerResult:
        if not self.client:
            return LayerResult(score=10.0, details="Groq API key missing - Check .env file", ai_confidence=0.0)
        
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower().split(':')[0]
        text_lower = text.lower()
        
        # 1. Whitelist Check
        if self._is_trusted(domain):
            return LayerResult(score=0.0, details="Verified official brand domain.", ai_confidence=0.0)

        # 2. Demo Brand Detection (Impersonation check)
        brands = ["paypal", "google", "microsoft"]
        for brand in brands:
            if brand in text_lower:
                # If brand mentioned but domain is NOT official and is a suspicious host
                is_suspicious_host = any(char.isdigit() for char in domain) or "192.168" in domain or "localhost" in domain
                if is_suspicious_host:
                    return LayerResult(
                        score=98.0, 
                        details=f"CRITICAL: Brand '{brand.upper()}' mentioned on an unofficial host '{domain}'.", 
                        ai_confidence=95.0
                    )

        try:
            prompt = f"""
            SYSTEM: Phishing Analysis AI. 
            URL: {url}
            Text: "{text[:1500]}"
            
            Return JSON:
            {{
                "risk_score": float,
                "ai_confidence": float,
                "summary": "Short explanation"
            }}
            """
            
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            
            import json
            result_json = json.loads(completion.choices[0].message.content)
            
            return LayerResult(
                score=float(result_json.get("risk_score", 0)),
                details=result_json.get("summary", "Analysis complete"),
                ai_confidence=float(result_json.get("ai_confidence", 0))
            )
            
        except Exception as e:
            return LayerResult(score=0.0, details=f"Linguistic analysis skipped: {str(e)}", ai_confidence=0.0)
