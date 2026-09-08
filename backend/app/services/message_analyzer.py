import re

from app.models.analysis import AnalysisResult, AnalysisSignal


SIGNAL_RULES = [
    (
        "Credential request",
        re.compile(r"\b(password|passcode|otp|one[- ]time code|login|verify your account)\b", re.I),
        "The message requests or references credentials or account verification.",
        30,
    ),
    (
        "Payment request",
        re.compile(r"\b(payment|pay now|gift card|bank transfer|wire transfer|invoice)\b", re.I),
        "The message requests money or payment-related action.",
        30,
    ),
    (
        "Urgency",
        re.compile(r"\b(urgent|immediately|now| within \d+ hours|last chance|act fast)\b", re.I),
        "The message creates time pressure that may discourage careful verification.",
        20,
    ),
    (
        "Fear or threat language",
        re.compile(r"\b(suspended|blocked|locked|legal action|police| fine|penalty)\b", re.I),
        "The message uses fear or consequences to pressure the recipient.",
        20,
    ),
    (
        "Reward or offer",
        re.compile(r"\b(congratulations|winner|won|prize|reward|free|refund)\b", re.I),
        "The message uses a reward or unexpected offer as bait.",
        15,
    ),
]


def analyze_message(message: str) -> AnalysisResult:
    signals: list[AnalysisSignal] = []

    for name, pattern, description, points in SIGNAL_RULES:
        if pattern.search(message):
            signals.append(
                AnalysisSignal(
                    name=name,
                    description=description,
                    points=points,
                )
            )

    url_count = len(re.findall(r"https?://\S+", message, re.I))
    if url_count:
        signals.append(
            AnalysisSignal(
                name="Link in message",
                description="The message contains a link that should be verified independently.",
                points=min(15, url_count * 5),
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
        category = "No significant social-engineering indicators detected"
        action = "Proceed carefully and verify unexpected requests."
    elif status == "SUSPICIOUS":
        category = "Potential social-engineering message"
        action = "Do not click links or share information. Verify through an official channel."
    else:
        category = "High-risk phishing or social-engineering message"
        action = "Do not respond or click links. Report the message and delete it."

    explanation = (
        "The message was analyzed locally using language and link indicators. "
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
