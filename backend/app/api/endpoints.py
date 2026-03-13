from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from app.models.schemas import ScanRequest, ScanResponse, LayerResult
from app.models.database import get_db
from app.models.scan_log import ScanLog
from app.services.linguistic import LinguisticAnalyzer
from app.services.visual import VisualAnalyzer
from app.services.behavioral import BehavioralAnalyzer
import time
import json
import datetime

router = APIRouter()

linguistic_analyzer = LinguisticAnalyzer()
visual_analyzer = VisualAnalyzer()
behavioral_analyzer = BehavioralAnalyzer()

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    total = db.query(ScanLog).count()
    threats = db.query(ScanLog).filter(ScanLog.risk_level == "PHISHING").count()
    suspicious = db.query(ScanLog).filter(ScanLog.risk_level == "SUSPICIOUS").count()
    return {
        "total": total,
        "threats": threats,
        "suspicious": suspicious
    }

@router.get("/scans")
async def get_scans(limit: int = 10, db: Session = Depends(get_db)):
    logs = db.query(ScanLog).order_by(ScanLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "url": log.url,
            "score": round(log.combined_score or 0.0, 1),
            "risk": log.risk_level,
            "time": (log.timestamp or datetime.datetime.now()).strftime("%H:%M:%S"),
            "layers": {
                "linguistic": log.linguistic_score or 0.0,
                "visual": log.visual_score or 0.0,
                "behavioral": log.behavioral_score or 0.0
            }
        }
        for log in logs
    ]

@router.post("/scan", response_model=ScanResponse)
async def scan_url(request: ScanRequest, req: Request, db: Session = Depends(get_db)):
    try:
        # Run all analysis layers
        linguistic_result = await linguistic_analyzer.analyze(request.url, request.html_content, request.text_content)
        visual_result = await visual_analyzer.analyze(request.url, request.screenshot)
        behavioral_result = await behavioral_analyzer.analyze(request.url)

        # AGGRESSIVE RISK CALCULATION FOR DEMO
        scores = [linguistic_result.score, visual_result.score, behavioral_result.score]
        max_score = max(scores)
        avg_score = sum(scores) / 3
        
        combined_score = (max_score * 0.7) + (avg_score * 0.3)
        
        risk_level = "SAFE"
        if combined_score > 70:
            risk_level = "PHISHING"
        elif combined_score > 30:
            risk_level = "SUSPICIOUS"
            
        print(f"--- [SCAN] {request.url} ---")
        print(f"Scores: L:{linguistic_result.score} V:{visual_result.score} B:{behavioral_result.score}")
        print(f"Result: {combined_score:.1f} -> {risk_level}")
        
        # PERSIST TO DATABASE
        db_log = ScanLog(
            url=request.url,
            combined_score=combined_score,
            risk_level=risk_level,
            linguistic_score=linguistic_result.score,
            visual_score=visual_result.score,
            behavioral_score=behavioral_result.score,
            details={
                "linguistic": linguistic_result.dict(),
                "visual": visual_result.dict(),
                "behavioral": behavioral_result.dict()
            }
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)

        # BROADCAST VIA WEBSOCKET
        manager = req.app.state.manager
        ws_message = {
            "id": db_log.id,
            "url": request.url,
            "score": round(combined_score, 1),
            "risk": risk_level,
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "layers": {
                "linguistic": linguistic_result.score,
                "visual": visual_result.score,
                "behavioral": behavioral_result.score
            }
        }
        await manager.broadcast(json.dumps(ws_message))
            
        return ScanResponse(
            url=request.url,
            combined_score=combined_score,
            risk_level=risk_level,
            layers={
                "linguistic": linguistic_result,
                "visual": visual_result,
                "behavioral": behavioral_result
            },
            ai_generated_phishing=linguistic_result.ai_confidence > 50,
            timestamp=time.time()
        )
    except Exception as e:
        print(f"Scan Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
