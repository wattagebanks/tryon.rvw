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


def make_background_transparent(
    image: Image.Image,
    threshold: int = 30,
) -> Image.Image:
    """Turn near-white pixels transparent when the model returns a solid background."""
    img = image.convert("RGBA")
    pixels = img.load()
    width, height = img.size

    transparent_count = 0
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] < 250:
                transparent_count += 1

    if transparent_count > (width * height) / 50:
        return img

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r >= 255 - threshold and g >= 255 - threshold and b >= 255 - threshold:
                pixels[x, y] = (r, g, b, 0)

    return img


def image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def bytes_to_image(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data))
