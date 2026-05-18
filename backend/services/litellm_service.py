"""Background removal via LiteLLM image_edit (generative / multimodal models)."""

from __future__ import annotations

import base64
import io
import os
from typing import Tuple

import httpx
from PIL import Image

from .image_utils import bytes_to_image, composite_on_background, image_to_png_bytes

REMOVE_BG_PROMPT = (
    "Remove the entire background from this image. "
    "Keep only the main subject with sharp, accurate edges. "
    "Do not alter the subject's appearance, colors, or proportions. "
    "Place the subject on a solid pure white background (#FFFFFF). "
    "No transparency, no checkerboard, no gradients, no shadows on the background."
)


def _prepare_square_png(image_bytes: bytes, max_side: int = 1024) -> bytes:
    """Many image_edit APIs expect square PNG; resize while preserving aspect."""
    img = bytes_to_image(image_bytes).convert("RGBA")
    w, h = img.size
    scale = min(max_side / max(w, h), 1.0)
    if scale < 1.0:
        new_size = (int(w * scale), int(h * scale))
        img = img.resize(new_size, Image.Resampling.LANCZOS)

    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (255, 255, 255, 255))
    offset = ((side - img.size[0]) // 2, (side - img.size[1]) // 2)
    canvas.paste(img, offset, img if img.mode == "RGBA" else None)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


async def remove_background_litellm(
    image_bytes: bytes,
    background_rgb: Tuple[int, int, int] = (255, 255, 255),
) -> bytes:
    base_url = os.getenv("LITELLM_BASE_URL", "").rstrip("/")
    api_key = os.getenv("LITELLM_API_KEY", "")
    model = os.getenv("LITELLM_MODEL", "gemini/gemini-2.5-flash-image")

    if not base_url or not api_key:
        raise ValueError(
            "LiteLLM is not configured. Set LITELLM_BASE_URL and LITELLM_API_KEY in .env"
        )

    edits_url = (
        f"{base_url}/images/edits"
        if base_url.endswith("/v1")
        else f"{base_url}/v1/images/edits"
    )

    png_bytes = _prepare_square_png(image_bytes)
    prompt = REMOVE_BG_PROMPT

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            edits_url,
            headers={"Authorization": f"Bearer {api_key}"},
            data={
                "model": model,
                "prompt": prompt,
                "n": "1",
                "size": "1024x1024",
                "response_format": "b64_json",
            },
            files={"image": ("input.png", png_bytes, "image/png")},
        )
        response.raise_for_status()
        payload = response.json()

    data = payload.get("data") or []
    if not data:
        raise RuntimeError("LiteLLM returned no image data")

    item = data[0]
    if item.get("b64_json"):
        raw = base64.b64decode(item["b64_json"])
    elif item.get("url"):
        async with httpx.AsyncClient(timeout=60.0) as client:
            img_resp = await client.get(item["url"])
            img_resp.raise_for_status()
            raw = img_resp.content
    else:
        raise RuntimeError("LiteLLM response missing b64_json or url")

    result = bytes_to_image(raw).convert("RGB")
    if background_rgb != (255, 255, 255):
        rgba = result.convert("RGBA")
        result = composite_on_background(rgba, background_rgb)
    return image_to_png_bytes(result)
