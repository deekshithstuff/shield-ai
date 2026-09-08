import ipaddress
from urllib.parse import urlparse

from app.models.analysis import AnalysisResult, AnalysisSignal


SHORTENER_DOMAINS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
}

SUSPICIOUS_KEYWORDS = {
    "login",
    "verify",
    "secure",
    "account",
    "update",
    "payment",
    "invoice",
    "password",
    "bank",
    "gift",
}


def _is_ip_address(hostname: str) -> bool:
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


def analyze_url(url: str) -> AnalysisResult:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    signals: list[AnalysisSignal] = []

    if _is_ip_address(hostname):
        signals.append(
            AnalysisSignal(
                name="IP address host",
                description="The URL uses a raw IP address instead of a normal domain.",
                points=35,
            )
        )

    if len(url) > 120:
        signals.append(
            AnalysisSignal(
                name="Excessive URL length",
                description="The URL is unusually long and may hide its true destination.",
                points=15,
            )
        )

    if hostname in SHORTENER_DOMAINS:
        signals.append(
            AnalysisSignal(
                name="URL shortener",
                description="The destination is hidden behind a URL-shortening service.",
                points=20,
            )
        )

    if "@" in parsed.netloc:
        signals.append(
            AnalysisSignal(
                name="Embedded credentials or delimiter",
                description="An @ character can obscure the actual destination host.",
                points=25,
            )
        )

    if hostname.startswith("xn--") or ".xn--" in hostname:
        signals.append(
            AnalysisSignal(
                name="Punycode domain",
                description="The domain uses encoded characters that can support lookalike impersonation.",
                points=25,
            )
        )

    matched_keywords = sorted(
        keyword for keyword in SUSPICIOUS_KEYWORDS if keyword in url.lower()
    )
    if matched_keywords:
        signals.append(
            AnalysisSignal(
                name="Suspicious URL keywords",
                description=f"Found security-sensitive terms: {', '.join(matched_keywords)}.",
                points=min(25, len(matched_keywords) * 5),
            )
        )

    if parsed.scheme != "https":
        signals.append(
            AnalysisSignal(
                name="No HTTPS",
                description="The URL does not use encrypted HTTPS transport.",
                points=10,
            )
        )

    risk_score = min(100, sum(signal.points for signal in signals))

    if risk_score >= 60:
        status = "DANGEROUS"
    elif risk_score >= 25:
        status = "SUSPICIOUS"
    else:
        status = "SAFE"

    if status == "SAFE":
        category = "No significant structural threat detected"
        action = "Proceed carefully and verify the sender or context."
    elif status == "SUSPICIOUS":
        category = "Potential phishing or deceptive URL"
        action = "Do not enter credentials or payment information. Verify the destination independently."
    else:
        category = "High-risk phishing or impersonation URL"
        action = "Do not open the URL. Report it and delete the message."

    explanation = (
        "The URL was analyzed locally using structural indicators. "
        f"{len(signals)} risk signal(s) contributed to the score."
    )

    return AnalysisResult(
        status=status,
        risk_score=risk_score,
        threat_category=category,
        explanation=explanation,
        recommended_action=action,
        indicators=signals,
    )
