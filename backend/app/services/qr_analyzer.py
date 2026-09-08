from __future__ import annotations

from urllib.parse import urlparse

import cv2
import numpy as np

from app.models.analysis import AnalysisSignal, QrAnalysisResult
from app.services.url_analyzer import analyze_url

MAX_QR_FILE_SIZE = 5 * 1024 * 1024


def _is_url(value: str) -> bool:
    parsed = urlparse(value)
    return bool(parsed.scheme and parsed.netloc) and parsed.scheme in {"http", "https"}


def _decode_qr(file_bytes: bytes) -> str:
    if not file_bytes:
        raise ValueError("No file selected.")
    if len(file_bytes) > MAX_QR_FILE_SIZE:
        raise ValueError("The QR image is too large. Please upload a file smaller than 5 MB.")

    try:
        image_array = np.frombuffer(file_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise ValueError("Invalid image file. Please upload a readable QR image.") from exc

    if image is None or image.size == 0:
        raise ValueError("Invalid image file. Please upload a readable QR image.")

    detector = cv2.QRCodeDetector()
    decoded_text, _, _ = detector.detectAndDecode(image)

    if not decoded_text or not decoded_text.strip():
        raise ValueError("No QR code detected. Please upload a clear image containing a QR code.")

    return decoded_text.strip()


def analyze_qr_image(file_bytes: bytes, filename: str = "") -> QrAnalysisResult:
    decoded_content = _decode_qr(file_bytes)

    if not _is_url(decoded_content):
        return QrAnalysisResult(
            status="SAFE",
            risk_score=0,
            threat_category="QR code detected, but it does not contain a URL.",
            explanation="The QR code was decoded successfully, but the embedded content is plain text rather than a URL. It was treated as untrusted input and never executed.",
            recommended_action="Review the decoded text manually and do not treat it as a website or login link.",
            indicators=[],
            decoded_content=decoded_content,
            is_url=False,
            analysis_type="QR",
        )

    try:
        url_result = analyze_url(decoded_content)
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise ValueError(
            "The QR code contained a URL, but the URL analyzer failed. Please verify the destination manually."
        ) from exc

    indicators = list(url_result.indicators)
    suspicious_keywords = sorted(
        keyword
        for keyword in {"login", "verify", "secure", "account", "password", "bank", "update", "payment"}
        if keyword in decoded_content.lower()
    )

    if url_result.status == "SAFE" and suspicious_keywords:
        indicators.append(
            AnalysisSignal(
                name="QR destination trust risk",
                description=f"The decoded QR destination contains login or verification language: {', '.join(suspicious_keywords)}.",
                points=25,
            )
        )
        risk_score = max(url_result.risk_score, 35)
        status = "DANGEROUS" if risk_score >= 60 else "SUSPICIOUS"
        threat_category = "Potential phishing or deceptive QR destination"
        recommended_action = "Do not enter credentials. Verify the destination independently before using it."
        explanation = (
            "The QR code contained a URL with credential-like or verification language. "
            "The destination was treated as untrusted input and checked locally without opening it."
        )
    else:
        risk_score = url_result.risk_score
        status = url_result.status
        threat_category = url_result.threat_category
        recommended_action = url_result.recommended_action
        explanation = (
            f"The QR code was decoded successfully and the embedded URL was analyzed locally. {url_result.explanation}"
        )

    return QrAnalysisResult(
        status=status,
        risk_score=risk_score,
        threat_category=threat_category,
        explanation=explanation,
        recommended_action=recommended_action,
        indicators=indicators,
        decoded_content=decoded_content,
        is_url=True,
        analysis_type="QR",
        analyzed_at=url_result.analyzed_at,
    )
