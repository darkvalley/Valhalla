"""Valhalla Batch Text v1.5.4: native ComfyUI list + dynamically reorderable text inputs.
Copyright (c) 2026 Werner de Jong. MIT License.
"""
import json
import re

_TEXT_INPUT_PATTERN = re.compile(r"TEXT:(\d+)\Z")
_TEXT_TYPE = ("STRING", {"forceInput": True})
DELIMITERS = {
    "None (direct)": "", "Space ( )": " ", "Comma (, )": ", ", "Comma (,)": ",",
    "Semicolon (; )": "; ", "Semicolon (;)": ";", "Colon (: )": ": ", "Colon (:)": ":",
    "Pipe ( | )": " | ", "Pipe (|)": "|", "Tab (\\t)": "\t",
    "LF (\\n)": "\n", "CR (\\r)": "\r", "CRLF (\\r\\n)": "\r\n",
    "Blank line (\\n\\n)": "\n\n",
}
LEGACY_DELIMITERS = {
    "Geen (direct)": "", "Spatie ( )": " ", "Komma (, )": ", ", "Komma (,)": ",",
    "Puntkomma (; )": "; ", "Puntkomma (;)": ";", "Dubbele punt (: )": ": ",
    "Dubbele punt (:)": ":", "Pipe ( | )": " | ", "Pipe (|)": "|",
    "Tab (\\t)": "\t", "LF (\\n)": "\n", "CR (\\r)": "\r", "CRLF (\\r\\n)": "\r\n",
    "Lege regel (\\n\\n)": "\n\n",
}
CUSTOM_OPTION = "Custom"
LEGACY_CUSTOM_OPTION = "Custom (eigen tekst)"
DELIMITER_OPTIONS = list(DELIMITERS) + [CUSTOM_OPTION]
_ESCAPE_RE = re.compile(r"\\(\\|n|r|t)")
_ESCAPE_VALUES = {"\\": "\\", "n": "\n", "r": "\r", "t": "\t"}


def decode_custom_delimiter(value):
    if not isinstance(value, str):
        raise TypeError("Batch Text: custom_delimiter must be a STRING")
    return _ESCAPE_RE.sub(lambda match: _ESCAPE_VALUES[match.group(1)], value)


def resolve_delimiter(option, custom_delimiter=""):
    if not isinstance(option, str):
        raise TypeError("Batch Text: delimiter must be a STRING")
    if option in (CUSTOM_OPTION, LEGACY_CUSTOM_OPTION):
        return decode_custom_delimiter(custom_delimiter)
    return DELIMITERS.get(option, LEGACY_DELIMITERS.get(option, option))


class FlexibleTextInputs(dict):
    @staticmethod
    def _is_text_input(name):
        return isinstance(name, str) and _TEXT_INPUT_PATTERN.fullmatch(name) is not None

    def __contains__(self, name):
        return self._is_text_input(name) or super().__contains__(name)

    def __getitem__(self, name):
        return _TEXT_TYPE if self._is_text_input(name) else super().__getitem__(name)

    def get(self, name, default=None):
        return _TEXT_TYPE if self._is_text_input(name) else super().get(name, default)


class ValhallaBatchText:
    INPUT_IS_LIST = True
    CATEGORY = "Valhalla's Calling/Text"
    FUNCTION = "join_text"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("TEXT",)
    DESCRIPTION = (
        "Combine native TEXT_LIST and dynamic TEXT:n inputs in the selected top-to-bottom "
        "order. Supports preset and custom delimiters. Click Info for help. "
        "© 2026 Werner de Jong (MIT)."
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "delimiter": (DELIMITER_OPTIONS, {"default": "None (direct)", "tooltip": "Separator inserted between text items"}),
                "custom_delimiter": ("STRING", {"default": "", "multiline": True, "tooltip": "Custom separator; supports \\n, \\r, \\t and \\\\"}),
            },
            "optional": FlexibleTextInputs({
                "TEXT_LIST": ("STRING", {"forceInput": True, "tooltip": "Native ComfyUI STRING list"}),
                "input_order": ("STRING", {"default": "", "tooltip": "Order maintained by the arrow buttons; do not edit"}),
            }),
        }

    @staticmethod
    def _unpack_widget(value, label):
        if isinstance(value, (tuple, list)):
            if not value:
                raise ValueError(f"Batch Text: {label} has no value")
            return value[0]
        return value

    @classmethod
    def _string_items(cls, value, label):
        if isinstance(value, str):
            yield value
        elif isinstance(value, (tuple, list)):
            for item in value:
                yield from cls._string_items(item, label)
        else:
            raise TypeError(f"Batch Text: {label} must contain STRING items; got {type(value).__name__}")

    @classmethod
    def _input_names_in_order(cls, input_order, available):
        default_order = sorted((n for n in available if _TEXT_INPUT_PATTERN.fullmatch(n)),
                               key=lambda n: int(n.split(':', 1)[1]))
        if "TEXT_LIST" in available:
            default_order.insert(0, "TEXT_LIST")
        raw = cls._unpack_widget(input_order, "input_order")
        if not isinstance(raw, str) or not raw.strip():
            return default_order
        try:
            stored = json.loads(raw)
        except (ValueError, TypeError):
            return default_order
        if not isinstance(stored, list):
            return default_order
        ordered = []
        for name in stored:
            if isinstance(name, str) and name in available and name not in ordered:
                ordered.append(name)
        ordered.extend(n for n in default_order if n not in ordered)
        return ordered

    @classmethod
    def join_text(cls, delimiter="None (direct)", custom_delimiter="", TEXT_LIST=None,
                  input_order="", **kwargs):
        mode = cls._unpack_widget(delimiter, "delimiter")
        custom = cls._unpack_widget(custom_delimiter, "custom_delimiter")
        sep = resolve_delimiter(mode, custom)
        available = {n: v for n, v in kwargs.items() if _TEXT_INPUT_PATTERN.fullmatch(n)}
        if TEXT_LIST is not None:
            available["TEXT_LIST"] = TEXT_LIST
        parts = []
        for name in cls._input_names_in_order(input_order, available):
            parts.extend(cls._string_items(available[name], name))
        return (sep.join(parts),)
