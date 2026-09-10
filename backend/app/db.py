import json
import os
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class AnalysisRecord(Base):
    __tablename__ = "analysis_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    analysis_type: Mapped[str] = mapped_column(String(20), nullable=False)
    input_summary: Mapped[str] = mapped_column(String(500), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    threat_category: Mapped[str] = mapped_column(String(200), nullable=False)
    indicators: Mapped[str] = mapped_column(String(4000), nullable=False, default="[]")
    explanation: Mapped[str] = mapped_column(String(3000), nullable=False)
    recommendation: Mapped[str] = mapped_column(String(1000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./shield_ai.db")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def _safe_summary(value: str, limit: int = 180) -> str:
    summary = (value or "").strip().replace("\r", " ").replace("\n", " ")
    summary = " ".join(summary.split())
    if len(summary) <= limit:
        return summary
    return f"{summary[:limit - 1].rstrip()}…"


def _serialize_indicators(indicators: list[dict] | None) -> str:
    if not indicators:
        return "[]"
    return json.dumps(indicators, ensure_ascii=True)


def save_analysis_record(analysis_type: str, raw_input: str, result) -> AnalysisRecord:
    db = SessionLocal()
    try:
        record = AnalysisRecord(
            analysis_type=str(analysis_type).upper(),
            input_summary=_safe_summary(str(raw_input or "")),
            risk_score=int(getattr(result, "risk_score", 0) or 0),
            status=str(getattr(result, "status", "SAFE") or "SAFE").upper(),
            threat_category=str(getattr(result, "threat_category", "") or "Unknown"),
            indicators=_serialize_indicators(
                [
                    {"name": signal.name, "description": signal.description, "points": signal.points}
                    for signal in getattr(result, "indicators", []) or []
                ]
            ),
            explanation=str(getattr(result, "explanation", "") or ""),
            recommendation=str(getattr(result, "recommended_action", "") or ""),
            created_at=datetime.now(timezone.utc),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    finally:
        db.close()


def get_history_records(search: str | None = None, status_filter: str | None = None, type_filter: str | None = None, sort: str = "newest") -> list[AnalysisRecord]:
    db: Session = SessionLocal()
    try:
        query = db.query(AnalysisRecord)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(AnalysisRecord.input_summary.ilike(search_term))
        if status_filter and status_filter.upper() != "ALL":
            query = query.filter(AnalysisRecord.status == status_filter.upper())
        if type_filter and type_filter.upper() != "ALL":
            query = query.filter(AnalysisRecord.analysis_type == type_filter.upper())
        if sort == "oldest":
            query = query.order_by(AnalysisRecord.created_at.asc())
        else:
            query = query.order_by(AnalysisRecord.created_at.desc())
        return query.all()
    finally:
        db.close()


def get_analysis_by_id(analysis_id: int) -> AnalysisRecord | None:
    db: Session = SessionLocal()
    try:
        return db.query(AnalysisRecord).filter(AnalysisRecord.id == analysis_id).one_or_none()
    finally:
        db.close()


def get_dashboard_stats() -> dict:
    db: Session = SessionLocal()
    try:
        total_count = db.query(func.count(AnalysisRecord.id)).scalar() or 0
        safe_count = db.query(func.count(AnalysisRecord.id)).filter(AnalysisRecord.status == "SAFE").scalar() or 0
        suspicious_count = db.query(func.count(AnalysisRecord.id)).filter(AnalysisRecord.status == "SUSPICIOUS").scalar() or 0
        dangerous_count = db.query(func.count(AnalysisRecord.id)).filter(AnalysisRecord.status == "DANGEROUS").scalar() or 0
        url_count = db.query(func.count(AnalysisRecord.id)).filter(AnalysisRecord.analysis_type == "URL").scalar() or 0
        message_count = db.query(func.count(AnalysisRecord.id)).filter(AnalysisRecord.analysis_type == "MESSAGE").scalar() or 0
        qr_count = db.query(func.count(AnalysisRecord.id)).filter(AnalysisRecord.analysis_type == "QR").scalar() or 0
        return {
            "total_scans": int(total_count),
            "safe_count": int(safe_count),
            "suspicious_count": int(suspicious_count),
            "dangerous_count": int(dangerous_count),
            "url_count": int(url_count),
            "message_count": int(message_count),
            "qr_count": int(qr_count),
        }
    finally:
        db.close()


def delete_all_analyses() -> int:
    db: Session = SessionLocal()
    try:
        deleted = db.query(AnalysisRecord).delete()
        db.commit()
        return deleted
    finally:
        db.close()


init_db()
