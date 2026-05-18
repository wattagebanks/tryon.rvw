"""Local background removal via rembg (U2-Net segmentation)."""

from __future__ import annotations

from rembg import remove, new_session

from .image_utils import bytes_to_image, image_to_png_bytes

_session = None


def _get_session():
    global _session
    if _session is None:
        _session = new_session("u2net")
    return _session


def remove_background_local(image_bytes: bytes) -> bytes:
    input_image = bytes_to_image(image_bytes)
    cutout = remove(input_image, session=_get_session())
    return image_to_png_bytes(cutout.convert("RGBA"))
