from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.analysis import (
    AnalysisResult,
    MessageAnalysisRequest,
    QrAnalysisResult,
    UrlAnalysisRequest,
)
from app.services.message_analyzer import analyze_message
from app.services.qr_analyzer import analyze_qr_image
from app.services.url_analyzer import analyze_url


router = APIRouter(prefix="/api/analyze", tags=["analysis"])


@router.post("/url", response_model=AnalysisResult)
def analyze_url_endpoint(request: UrlAnalysisRequest) -> AnalysisResult:
    return analyze_url(str(request.url))


@router.post("/message", response_model=AnalysisResult)
def analyze_message_endpoint(request: MessageAnalysisRequest) -> AnalysisResult:
    return analyze_message(request.message)


@router.post("/qr", response_model=QrAnalysisResult)
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
        return analyze_qr_image(file_bytes, filename=file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
