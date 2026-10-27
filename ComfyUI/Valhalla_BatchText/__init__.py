"""Valhalla Batch Text v1.5.3 — © 2026 Werner de Jong, MIT license."""

from .batch_text import ValhallaBatchText

NODE_CLASS_MAPPINGS = {
    "ValhallaBatchText": ValhallaBatchText,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ValhallaBatchText": "Batch Text",
}

# Exposes the JS code that grows TEXT:0, TEXT:1, ... on the ComfyUI canvas.
WEB_DIRECTORY = "./web/js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
