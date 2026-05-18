"""Shared image helpers for background removal output."""

from __future__ import annotations

import io
from typing import Tuple

from PIL import Image


def parse_hex_color(hex_color: str) -> Tuple[int, int, int]:
    value = hex_color.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    if len(value) != 6:
        raise ValueError(f"Invalid hex color: {hex_color}")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def composite_on_background(
    rgba_image: Image.Image,
    background_rgb: Tuple[int, int, int] = (255, 255, 255),
) -> Image.Image:
    """Flatten RGBA cutout onto an opaque RGB background."""
    rgba = rgba_image.convert("RGBA")
    background = Image.new("RGB", rgba.size, background_rgb)
    background.paste(rgba, mask=rgba.split()[3])
    return background


def image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def bytes_to_image(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data))
