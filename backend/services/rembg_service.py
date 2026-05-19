"""Local background removal via rembg (bria-rmbg)."""

from __future__ import annotations

from rembg import new_session, remove

from .image_utils import bytes_to_image, image_to_png_bytes

MODEL = "bria-rmbg"

_session = None


def _get_session():
    global _session
    if _session is None:
        _session = new_session(MODEL)
    return _session


def remove_background(image_bytes: bytes) -> bytes:
    input_image = bytes_to_image(image_bytes)
    cutout = remove(input_image, session=_get_session())
    return image_to_png_bytes(cutout.convert("RGBA"))
