from pydantic import BaseModel
from typing import Optional, Dict, Any

class ScanRequest(BaseModel):
    url: str
    html_content: str
    text_content: str
    screenshot: Optional[str] = None # Base64 encoded screenshot
    dom_summary: Optional[Dict[str, Any]] = None
    sender_info: Optional[str] = None

class LayerResult(BaseModel):
    score: float
    details: str
    ai_confidence: Optional[float] = 0.0

class ScanResponse(BaseModel):
    url: str
    combined_score: float
    risk_level: str
    layers: Dict[str, LayerResult]
    ai_generated_phishing: bool
    timestamp: float
