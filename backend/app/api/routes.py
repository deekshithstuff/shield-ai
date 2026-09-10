import json
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.db import delete_all_analyses, get_analysis_by_id, get_dashboard_stats, get_history_records, save_analysis_record
from app.models.analysis import (
    AnalysisResult,
    MessageAnalysisRequest,
    QrAnalysisResult,
    UrlAnalysisRequest,
)
from app.services.message_analyzer import analyze_message
from app.services.qr_analyzer import analyze_qr_image
from app.services.url_analyzer import analyze_url


router = APIRouter(prefix="/api", tags=["analysis"])


def _persist_analysis(analysis_type: str, raw_input: str, result) -> None:
    try:
        save_analysis_record(analysis_type, raw_input, result)
    except Exception:
        pass


@router.post("/analyze/url", response_model=AnalysisResult)
def analyze_url_endpoint(request: UrlAnalysisRequest) -> AnalysisResult:
    result = analyze_url(str(request.url))
    _persist_analysis("URL", str(request.url), result)
    return result


@router.post("/analyze/message", response_model=AnalysisResult)
def analyze_message_endpoint(request: MessageAnalysisRequest) -> AnalysisResult:
    result = analyze_message(request.message)
    _persist_analysis("MESSAGE", request.message, result)
    return result


@router.post("/analyze/qr", response_model=QrAnalysisResult)
def analyze_qr_endpoint(file: UploadFile = File(...)) -> QrAnalysisResult:
    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="No file selected. Please upload a QR image.")

    file_type = (file.content_type or "").lower()
    allowed_types = {"image/png", "image/jpeg", "image/webp"}
    if file_type not in allowed_types:
        extension = (file.filename or "").lower()
        if not any(extension.endswith(item) for item in (".png", ".jpg", ".jpeg", ".webp")):
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PNG, JPG, or WebP image.")

    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="No file selected. Please upload a QR image.")

    try:
        result = analyze_qr_image(file_bytes, filename=file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    _persist_analysis("QR", result.decoded_content, result)
    return result


@router.get("/analyses")
def get_analyses(search: str | None = None, status: str | None = None, type: str | None = None, sort: str = "newest"):
    return [
        {
            "id": record.id,
            "analysis_type": record.analysis_type,
            "input_summary": record.input_summary,
            "risk_score": record.risk_score,
            "status": record.status,
            "threat_category": record.threat_category,
            "indicators": json.loads(record.indicators or "[]"),
            "explanation": record.explanation,
            "recommendation": record.recommendation,
            "created_at": record.created_at.isoformat(),
        }
        for record in get_history_records(search=search, status_filter=status, type_filter=type, sort=sort)
    ]


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: int):
    record = get_analysis_by_id(analysis_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return {
        "id": record.id,
        "analysis_type": record.analysis_type,
        "input_summary": record.input_summary,
        "risk_score": record.risk_score,
        "status": record.status,
        "threat_category": record.threat_category,
        "indicators": json.loads(record.indicators or "[]"),
        "explanation": record.explanation,
        "recommendation": record.recommendation,
        "created_at": record.created_at.isoformat(),
    }


@router.get("/dashboard/stats")
def dashboard_stats():
    return get_dashboard_stats()


@router.delete("/analyses")
def delete_analyses():
    try:
        deleted = delete_all_analyses()
        return {"deleted": deleted, "message": "All analysis history deleted."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to clear analysis history.") from exc
