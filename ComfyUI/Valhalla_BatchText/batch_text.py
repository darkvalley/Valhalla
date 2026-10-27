"""Valhalla Batch Text v1.4.0 — STRING and native ComfyUI list joiner.

Multiple dynamically-created STRING sockets TEXT:0, TEXT:1, ... are populated
by the companion frontend extension. No fixed maximum is imposed by this node.

Copyright (c) 2026 Werner de Jong. MIT License.
"""

import re


_TEXT_INPUT_PATTERN = re.compile(r"TEXT:(\d+)\Z")
_TEXT_TYPE = ("STRING", {"forceInput": True})

# IMPORTANT: Keep these exact labels in sync with the frontend migration map.
# The first entry is the default. The value represents actual Python characters.
DELIMITERS = {
    "None (direct)": "",
    "Space ( )": " ",
    "Comma (, )": ", ",
    "Comma (,)": ",",
    "Semicolon (; )": "; ",
    "Semicolon (;)": ";",
    "Colon (: )": ": ",
    "Colon (:)": ":",
    "Pipe ( | )": " | ",
    "Pipe (|)": "|",
    "Tab (\\t)": "\t",
    "LF (\\n)": "\n",
    "CR (\\r)": "\r",
    "CRLF (\\r\\n)": "\r\n",
    "Blank line (\\n\\n)": "\n\n",
}
# Prior saved workflows can use the Dutch v1.2/v1.3 labels. Preserve their
# literal separator meaning in the Python execution layer as well as the UI.
LEGACY_DELIMITERS = {
    "Geen (direct)": "",
    "Spatie ( )": " ",
    "Komma (, )": ", ",
    "Komma (,)": ",",
    "Puntkomma (; )": "; ",
    "Puntkomma (;)": ";",
    "Dubbele punt (: )": ": ",
    "Dubbele punt (:)": ":",
    "Pipe ( | )": " | ",
    "Pipe (|)": "|",
    "Tab (\\t)": "\t",
    "LF (\\n)": "\n",
    "CR (\\r)": "\r",
    "CRLF (\\r\\n)": "\r\n",
    "Lege regel (\\n\\n)": "\n\n",
}
CUSTOM_OPTION = "Custom"
LEGACY_CUSTOM_OPTION = "Custom (eigen tekst)"
DELIMITER_OPTIONS = list(DELIMITERS) + [CUSTOM_OPTION]
_ESCAPE_RE = re.compile(r"\\(\\|n|r|t)")
_ESCAPE_VALUES = {"\\": "\\", "n": "\n", "r": "\r", "t": "\t"}


def decode_custom_delimiter(value):
    """Translate only explicitly supported escapes, retain all other text.

    To enter the literal characters \\n, type \\\\n in the Custom widget.
    """
    if not isinstance(value, str):
        raise TypeError("Batch Text: custom_delimiter must be a STRING")
    return _ESCAPE_RE.sub(lambda match: _ESCAPE_VALUES[match.group(1)], value)


def resolve_delimiter(option, custom_delimiter=""):
    """Map a preset to its real separator, retaining v1.0/1.1 raw values.

    Older API workflows pass literal `delimiter` strings. Unrecognized values
    are deliberately treated literally for backwards-compatible API execution.
    """
    if not isinstance(option, str):
        raise TypeError("Batch Text: delimiter must be a STRING")
    if option in (CUSTOM_OPTION, LEGACY_CUSTOM_OPTION):
        return decode_custom_delimiter(custom_delimiter)
    return DELIMITERS.get(option, LEGACY_DELIMITERS.get(option, option))


class FlexibleTextInputs(dict):
    """Recognize dynamically named STRING inputs on the ComfyUI server."""

    @staticmethod
    def _is_text_input(name):
        return isinstance(name, str) and _TEXT_INPUT_PATTERN.fullmatch(name) is not None

    def __contains__(self, name):
        return self._is_text_input(name) or super().__contains__(name)

    def __getitem__(self, name):
        if self._is_text_input(name):
            return _TEXT_TYPE
        return super().__getitem__(name)

    def get(self, name, default=None):
        if self._is_text_input(name):
            return _TEXT_TYPE
        return super().get(name, default)


class ValhallaBatchText:
    """Join a native ComfyUI STRING list and dynamic STRING inputs."""

    # Native ComfyUI lists use the usual STRING socket type. With this flag,
    # ALL inputs, including widget values, arrive as Python lists. A list
    # coming from OUTPUT_IS_LIST=True may have any length.
    INPUT_IS_LIST = True
    CATEGORY = "Valhalla's Calling/Text"
    FUNCTION = "join_text"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("TEXT",)
    DESCRIPTION = (
        "Join native ComfyUI STRING lists through TEXT_LIST, followed by "
        "dynamically connected TEXT:0, TEXT:1 ... inputs. No input limit. "
        "Choose a delimiter including CR/LF/CRLF or a custom separator. "
        "A normal multi-line STRING is NOT automatically split into a list. "
        "Click Info for details. © 2026 Werner de Jong (MIT)."
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "delimiter": (DELIMITER_OPTIONS, {"default": "None (direct)", "tooltip": "Separator inserted between text items"}),
                "custom_delimiter": ("STRING", {"default": "", "multiline": True, "tooltip": "Custom separator: literal text or escapes \\n, \\r, \\t, \\\\"}),
            },
            "optional": FlexibleTextInputs({
                "TEXT_LIST": ("STRING", {
                    "forceInput": True,
                    "tooltip": "Native ComfyUI STRING list (OUTPUT_IS_LIST); an ordinary STRING is one item.",
                }),
            }),
        }

    @staticmethod
    def _unpack_widget(value, label):
        """INPUT_IS_LIST=True wraps even delimiter widgets in a list."""
        if isinstance(value, (list, tuple)):
            if not value:
                raise ValueError(f"Batch Text: {label} has no value")
            return value[0]
        return value  # direct invocation / backwards compatible tests

    @classmethod
    def _string_items(cls, value, label):
        """Return strings from a Comfy list or one nested raw Python list.

        A newline-containing string is one item, not multiple items.
        Reject non-strings rather than silently stringifying images or numbers.
        """
        if isinstance(value, str):
            yield value
        elif isinstance(value, (tuple, list)):
            for item in value:
                yield from cls._string_items(item, label)
        else:
            raise TypeError(
                f"Batch Text: {label} must contain STRING items; "
                f"got {type(value).__name__}"
            )

    @classmethod
    def join_text(cls, delimiter="None (direct)", custom_delimiter="", TEXT_LIST=None, **kwargs):
        mode = cls._unpack_widget(delimiter, "delimiter")
        custom = cls._unpack_widget(custom_delimiter, "custom_delimiter")
        sep = resolve_delimiter(mode, custom)

        parts = []
        # Defined ordering: list items first, then the dynamic TEXT:n sockets.
        if TEXT_LIST is not None:
            parts.extend(cls._string_items(TEXT_LIST, "TEXT_LIST"))

        numbered = []
        for name, value in kwargs.items():
            match = _TEXT_INPUT_PATTERN.fullmatch(name)
            if match is not None:
                numbered.append((int(match.group(1)), name, value))
        numbered.sort(key=lambda entry: entry[0])
        for _, name, value in numbered:
            parts.extend(cls._string_items(value, name))

        return (sep.join(parts),)
