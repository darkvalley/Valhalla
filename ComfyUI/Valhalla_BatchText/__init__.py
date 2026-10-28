"""Valhalla Batch Text v1.5.4 — © 2026 Werner de Jong, MIT License."""
from .batch_text import ValhallaBatchText

NODE_CLASS_MAPPINGS = {"ValhallaBatchText": ValhallaBatchText}
NODE_DISPLAY_NAME_MAPPINGS = {"ValhallaBatchText": "Batch Text"}
WEB_DIRECTORY = "./web/js"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
