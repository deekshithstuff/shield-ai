from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


ThreatStatus = Literal["SAFE", "SUSPICIOUS", "DANGEROUS"]


class AnalysisSignal(BaseModel):
    name: str
    description: str
    points: int = Field(ge=0, le=100)


class AnalysisResult(BaseModel):
    status: ThreatStatus
    risk_score: int = Field(ge=0, le=100)
    threat_category: str
    explanation: str
    recommended_action: str
    indicators: list[AnalysisSignal]
    analyzed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class UrlAnalysisRequest(BaseModel):
    url: HttpUrl


class MessageAnalysisRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)


class QrAnalysisResult(AnalysisResult):
    decoded_content: str
    is_url: bool
    analysis_type: Literal["QR"] = "QR"
