"""Background removal API — local (rembg) or LiteLLM-powered."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from services.litellm_service import remove_background_litellm
from services.rembg_service import remove_background_local

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(
    title="tryon.rvw BG Remove",
    description="Remove image backgrounds and return transparent PNG cutouts.",
    version="1.0.0",
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(
    ","
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BYTES = int(os.getenv("MAX_UPLOAD_MB", "15")) * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"}


@app.get("/api/health")
async def health():
    litellm_ready = bool(os.getenv("LITELLM_BASE_URL") and os.getenv("LITELLM_API_KEY"))
    return {
        "status": "ok",
        "providers": {
            "local": {"available": True, "label": "Local (rembg / U2-Net)"},
            "litellm": {
                "available": litellm_ready,
                "model": os.getenv("LITELLM_MODEL", "gemini/gemini-2.5-flash-image"),
                "label": "LiteLLM",
            },
        },
        "default_provider": os.getenv("DEFAULT_PROVIDER", "local"),
    }


@app.post("/api/remove-background")
async def remove_background(
    file: UploadFile = File(...),
    provider: str = Form("local"),
):
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported type: {file.content_type}. Use JPEG, PNG, or WebP.",
        )

    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {MAX_BYTES // (1024 * 1024)} MB).",
        )
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file.")

    provider = provider.strip().lower()
    try:
        if provider == "litellm":
            result = await remove_background_litellm(raw)
        elif provider == "local":
            result = remove_background_local(raw)
        else:
            raise HTTPException(
                status_code=400,
                detail="provider must be 'local' or 'litellm'",
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}") from exc

    filename = (file.filename or "image").rsplit(".", 1)[0] + "-no-bg.png"
    return Response(
        content=result,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
