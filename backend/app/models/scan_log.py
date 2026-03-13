from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from .database import Base
import datetime

class ScanLog(Base):
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True)
    combined_score = Column(Float)
    risk_level = Column(String)
    linguistic_score = Column(Float)
    visual_score = Column(Float)
    behavioral_score = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    details = Column(JSON) # Store full layer results
