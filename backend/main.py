"""Background removal API — local bria-rmbg via rembg."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from services.rembg_service import MODEL, remove_background

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(
    title="tryon.rvw BG Remove",
    description="Remove image backgrounds and return transparent PNG cutouts.",
    version="2.0.0",
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
    return {
        "status": "ok",
        "engine": MODEL,
        "ready": True,
    }


@app.post("/api/remove-background")
async def remove_background_route(file: UploadFile = File(...)):
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

    try:
        result = remove_background(raw)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}") from exc

    filename = (file.filename or "image").rsplit(".", 1)[0] + "-no-bg.png"
    return Response(
        content=result,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
