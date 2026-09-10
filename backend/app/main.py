import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as analysis_router


def _get_allowed_origins() -> list[str]:
    raw_origins = os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


app = FastAPI(
    title="SHIELD.AI API",
    description="Defensive phishing and social-engineering analysis API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(analysis_router)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"name": "SHIELD.AI", "status": "online"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
