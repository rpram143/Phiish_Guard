import os
import httpx
import whois
import ssl
import socket
from datetime import datetime
from app.models.schemas import LayerResult
from urllib.parse import urlparse
import re

class BehavioralAnalyzer:
    def __init__(self):
        self.trusted_roots = ["google.com", "paypal.com", "microsoft.com", "office.com", "live.com", "microsoftonline.com"]

    def _is_trusted(self, domain):
        for root in self.trusted_roots:
            if domain == root or domain.endswith("." + root):
                return True
        return False

    async def check_ssl(self, domain):
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    # Check issuer and dates
                    issuer = dict(x[0] for x in cert['issuer'])
                    common_name = issuer.get('commonName', '')
                    
                    not_before = datetime.strptime(cert['notBefore'], '%b %d %H:%M:%S %Y %Z')
                    age_days = (datetime.utcnow() - not_before).days
                    
                    return {
                        "issuer": common_name,
                        "age_days": age_days,
                        "is_lets_encrypt": "Let's Encrypt" in common_name
                    }
        except:
            return None

    async def analyze(self, url: str) -> LayerResult:
        score = 0.0
        details = []
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower().split(':')[0]
        
        # 0. Whitelist Check
        if self._is_trusted(domain):
            return LayerResult(score=0.0, details="Verified official domain reputation.", ai_confidence=0.0)

        # 1. Redirect Chain Analysis
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                response = await client.get(url)
                if len(response.history) > 2:
                    score += 40
                    details.append(f"Suspicious: Long redirect chain ({len(response.history)} hops)")
                
                # Check for suspicious intermediate domains
                for history in response.history:
                    h_domain = urlparse(str(history.url)).netloc
                    if any(tld in h_domain for tld in [".xyz", ".tk", ".top", ".top", ".work"]):
                        score += 30
                        details.append(f"Redirect through suspicious TLD: {h_domain}")
        except Exception as e:
            print(f"Redirect Check Error: {e}")

        # 2. SSL Certificate Check
        ssl_info = await self.check_ssl(domain)
        if ssl_info:
            if ssl_info["is_lets_encrypt"] and ssl_info["age_days"] < 14:
                # High-value brand targeting check
                brands = ["paypal", "google", "microsoft", "bank", "login", "secure"]
                if any(brand in domain for brand in brands):
                    score += 60
                    details.append(f"CRITICAL: Recently issued Let's Encrypt cert ({ssl_info['age_days']} days) for brand-related domain")
                else:
                    score += 20
                    details.append(f"New Let's Encrypt cert ({ssl_info['age_days']} days)")
        else:
            if not domain.startswith("192.168") and domain != "localhost":
                score += 30
                details.append("No valid SSL certificate found")

        # 3. Domain Age (WHOIS)
        if "." in domain and not domain.startswith("192.168") and domain != "localhost":
            try:
                # Basic WHOIS check - can be slow, so we wrap it
                w = whois.whois(domain)
                creation_date = getattr(w, 'creation_date', None)
                
                if isinstance(creation_date, list): 
                    creation_date = creation_date[0]
                
                if creation_date and isinstance(creation_date, datetime):
                    age = (datetime.now() - creation_date).days
                    if age < 30:
                        score = max(score, 80.0)
                        details.append(f"Domain is extremely new ({age} days)")
                    elif age < 90:
                        score = max(score, 30.0)
                        details.append(f"Domain is relatively new ({age} days)")
            except Exception as e:
                # Silently skip if WHOIS fails or times out
                print(f"WHOIS Lookup failed for {domain}: {e}")
                pass

        return LayerResult(
            score=min(score, 100.0),
            details=" | ".join(details) if details else "Normal behavior",
            ai_confidence=0.0
        )
