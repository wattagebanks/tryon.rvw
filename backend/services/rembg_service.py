"""Local background removal via rembg (U2-Net segmentation)."""

from __future__ import annotations

from typing import Tuple

from PIL import Image
from rembg import remove, new_session

from .image_utils import composite_on_background, image_to_png_bytes

# Lazy-loaded session for faster repeat requests
_session = None


def _get_session():
    global _session
    if _session is None:
        _session = new_session("u2net")
    return _session


def remove_background_local(
    image_bytes: bytes,
    background_rgb: Tuple[int, int, int] = (255, 255, 255),
) -> bytes:
    from .image_utils import bytes_to_image

    input_image = bytes_to_image(image_bytes)
    cutout = remove(input_image, session=_get_session())
    result = composite_on_background(cutout, background_rgb)
    return image_to_png_bytes(result)
