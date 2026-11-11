"""Valhalla Batch Text v1.6.0: native ComfyUI list + dynamically reorderable text inputs.
Copyright (c) 2026 Werner de Jong. MIT License.
"""
import json
import re
import asyncio
from collections import OrderedDict
from datetime import datetime
import logging
import os
from pathlib import Path
import threading
from urllib.parse import unquote

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
    OUTPUT_NODE = True  # Preview can execute without any connected downstream node.
    DEFAULT_MAX_CHARS = 200_000
    MAX_PREVIEW_CHARS = 2_000_000
    CATEGORY = "Valhalla's Calling/Text"
    FUNCTION = "join_text"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("TEXT",)
    DESCRIPTION = (
        "Combine native TEXT_LIST and dynamic TEXT:n inputs in the selected top-to-bottom "
        "order. Supports preset and custom delimiters, optional preview and logging. Click Info for help. "
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
                # Append-only: existing saved delimiter/custom/input_order widget positions stay intact.
                "show_preview": ("BOOLEAN", {"default": False, "label_on": "Aan", "label_off": "Uit"}),
                "write_log": ("BOOLEAN", {"default": False, "label_on": "Aan", "label_off": "Uit"}),
                "log_folder": ("STRING", {"default": "", "multiline": False,
                                           "tooltip": "Leeg = map waarin de huidige workflow is opgeslagen"}),
                "max_chars": ("INT", {"default": 200000, "min": 100, "max": 2000000, "step": 100}),
                "workflow_hint": ("STRING", {"default": "", "tooltip": "Actief workflowpad (automatisch ingevuld)"}),
            }),
            "hidden": {"unique_id": "UNIQUE_ID", "extra_pnginfo": "EXTRA_PNGINFO",
                       "prompt": "PROMPT"},
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

    @staticmethod
    def _scalar(value, default=None):
        if isinstance(value, (tuple, list)):
            return value[0] if value else default
        return default if value is None else value

    @classmethod
    def IS_CHANGED(cls, show_preview=False, write_log=False, **kwargs):
        # A previous run may have been cached without UI preview output (e.g.
        # before show_preview was enabled). Recompute the small join whenever
        # preview is active so ComfyUI sends a fresh executed UI payload.
        # Crucially the original output contract remains unchanged when OFF.
        return float("nan") if _bool(cls._scalar(show_preview)) else None

    @classmethod
    def join_text(cls, delimiter="None (direct)", custom_delimiter="", TEXT_LIST=None,
                  input_order="", show_preview=False, write_log=False, log_folder="",
                  max_chars=200000, workflow_hint="", unique_id=None,
                  extra_pnginfo=None, prompt=None, **kwargs):
        mode = cls._unpack_widget(delimiter, "delimiter")
        custom = cls._unpack_widget(custom_delimiter, "custom_delimiter")
        sep = resolve_delimiter(mode, custom)
        available = {n: v for n, v in kwargs.items() if _TEXT_INPUT_PATTERN.fullmatch(n)}
        if TEXT_LIST is not None:
            available["TEXT_LIST"] = TEXT_LIST
        parts = []
        for name in cls._input_names_in_order(input_order, available):
            parts.extend(cls._string_items(available[name], name))
        combined = sep.join(parts)
        if not _bool(cls._scalar(show_preview, False)):
            return (combined,)  # Precisely the v1.5.4 return contract when preview is OFF.

        try:
            limit = max(100, min(int(cls._scalar(max_chars, cls.DEFAULT_MAX_CHARS)), cls.MAX_PREVIEW_CHARS))
        except (TypeError, ValueError, OverflowError):
            limit = cls.DEFAULT_MAX_CHARS
        count = len(combined)
        display = combined[:limit]
        if count > limit:
            display += f"\n\n[PREVIEW AFGEKAPT: {limit} / {count} tekens; verhoog max_chars om meer te bekijken.]"
        ui = {"text": [display], "character_count": [count],
              "displayed_character_count": [min(count, limit)],
              "log_path": [""], "log_error": [""]}
        if _bool(cls._scalar(write_log, False)):
            workflow = _workflow_data(cls._scalar(extra_pnginfo))
            folder = cls._scalar(log_folder, "")
            hint = cls._scalar(workflow_hint, "")
            filename, error = _write_log(
                combined, folder, _node_title(workflow, cls._scalar(unique_id)),
                workflow, cls._scalar(prompt), hint)
            ui["log_path"] = [filename]
            ui["log_error"] = [error]
        return {"ui": ui, "result": (combined,)}


# Optional inspection and cumulative logging; self-contained so installing Batch Text
# does not require ValhallaTextStudio or any additional custom nodes.
_LOGGER = logging.getLogger(__name__)
_LOG_LOCK = threading.RLock()
_RECENT_PROMPTS = OrderedDict()
_LOG_META_KEY = "valhalla_text_inspector_run"  # Share run metadata with existing Inspector.
_TIMESTAMP = re.compile(r"^\d{8}_\d{6}_\d{3}$")
_INVALID_NAME = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_WINDOWS_RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)),
                     *(f"LPT{i}" for i in range(1, 10))}


def _bool(value):
    # ComfyUI passes widget inputs as one-element lists with INPUT_IS_LIST=True.
    if isinstance(value, (tuple, list)):
        value = value[0] if value else False
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "on", "aan"}
    return bool(value)


def _is_auto_folder(value):
    return value is None or str(value).strip().lower() in ("", "none", "null", "auto")


def _safe_name(value):
    raw = str(value or "Valhalla_Workflow").replace("\\", "/").split("/")[-1]
    raw = re.sub(r"\.json$", "", raw, flags=re.IGNORECASE)
    name = _INVALID_NAME.sub("_", raw).strip(" .")[:100].rstrip(" .")
    return name if name and name.upper() not in _WINDOWS_RESERVED else "Valhalla_Workflow"


def _workflow_data(extra_pnginfo):
    if isinstance(extra_pnginfo, dict) and isinstance(extra_pnginfo.get("workflow"), dict):
        return extra_pnginfo["workflow"]
    return {}


def _node_title(workflow, unique_id):
    nodes = workflow.get("nodes", [])
    for item in nodes if isinstance(nodes, list) else []:
        if not isinstance(item, dict) or str(item.get("id")) != str(unique_id):
            continue
        title = str(item.get("title") or "").strip()
        if title:
            return title
        props = item.get("properties")
        if isinstance(props, dict) and props.get("Node name for S&R"):
            return str(props["Node name for S&R"])
    return "Batch Text"


def _workflow_root():
    try:
        import folder_paths  # ComfyUI's configured user directory, not current working directory.
        return Path(folder_paths.get_user_directory()) / "default" / "workflows"
    except (ImportError, AttributeError):
        return Path.cwd() / "user" / "default" / "workflows"


def _workflow_hint(workflow, hint):
    if isinstance(hint, str) and hint.strip():
        return hint.strip()
    for key in ("path", "filename", "name"):
        value = workflow.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _auto_workflow_folder(workflow=None, hint=""):
    """Resolve a saved ComfyUI workflow's directory, including named subfolders.

    Web browsers cannot reveal the source path of an arbitrary imported local JSON
    file. Such workflows fall back to ComfyUI's user/default/workflows directory.
    """
    workflow = workflow if isinstance(workflow, dict) else {}
    root = _workflow_root()
    raw = _workflow_hint(workflow, hint)
    if not raw:
        return root
    raw = os.path.expandvars(os.path.expanduser(raw))
    path = Path(raw)
    if path.is_absolute():
        if path.is_file():
            return path.parent
        if path.is_dir():
            return path
        # In a saved ComfyUI tab, absolute URLs may not be real disk paths.
        raw = raw.replace("\\", "/")
    # Strip ComfyUI virtual URI prefixes (e.g. /api/userdata/workflows/abc.json).
    unix = unquote(raw.replace("\\", "/").split("?", 1)[0])
    marker = "/workflows/"
    if marker in unix:
        unix = unix.rsplit(marker, 1)[-1]
    elif unix.startswith("workflows/"):
        unix = unix[len("workflows/"):]
    elif unix.startswith("/"):
        unix = unix.split("/")[-1]
    # Parent traversal never escapes the designated workflow storage area.
    rel = Path(*[part for part in unix.split("/") if part and part not in (".", "..")])
    folder = root / rel.parent if rel.suffix.lower() == ".json" else root / rel
    return folder if folder.is_dir() else root


def _effective_folder(folder, workflow=None, hint=""):
    if _is_auto_folder(folder):
        return _auto_workflow_folder(workflow, hint)
    return Path(os.path.expandvars(os.path.expanduser(str(folder).strip())))


def _run_metadata(workflow, prompt, hint=""):
    extra = workflow.get("extra")
    metadata = extra.get(_LOG_META_KEY) if isinstance(extra, dict) else None
    if isinstance(metadata, dict) and isinstance(metadata.get("timestamp"), str) and \
            _TIMESTAMP.fullmatch(metadata["timestamp"]):
        return _safe_name(metadata.get("workflow_name") or _workflow_hint(workflow, hint)), metadata["timestamp"]
    with _LOG_LOCK:
        if isinstance(prompt, dict):
            key = id(prompt)
            prior = _RECENT_PROMPTS.get(key)
            if prior is not None and prior[0] is prompt:
                _RECENT_PROMPTS.move_to_end(key)
                stamp = prior[1]
            else:
                stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
                _RECENT_PROMPTS[key] = (prompt, stamp)
                while len(_RECENT_PROMPTS) > 32:
                    _RECENT_PROMPTS.popitem(last=False)
        else:
            stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
    return _safe_name(_workflow_hint(workflow, hint) or "Valhalla_Workflow"), stamp


def _write_log(text, folder, node_title, workflow, prompt, hint=""):
    directory = _effective_folder(folder, workflow, hint)
    if not directory.is_dir():
        return "", f"Logmap bestaat niet: {directory}. Kies een bestaande map met de mapknop."
    name, stamp = _run_metadata(workflow, prompt, hint)
    target = directory / f"{name}_{stamp}.txt"
    try:
        with _LOG_LOCK:
            with target.open("a", encoding="utf-8", newline="\n") as handle:
                handle.write(f"{node_title}\n\n\n{text}\n\n\n")
        return str(target), ""
    except OSError as exc:
        _LOGGER.warning("Batch Text log schrijffout: %s", exc)
        return "", f"Schrijven naar log mislukt: {exc}"


def _select_folder(initial_dir):
    if os.name != "nt":
        raise RuntimeError("De Windows-mapkiezer werkt alleen wanneer de ComfyUI-server op Windows draait.")
    import tkinter as tk
    from tkinter import filedialog
    root = tk.Tk()
    root.withdraw()
    try:
        root.attributes("-topmost", True)
        start = Path(initial_dir)
        if not start.is_dir():
            start = next((p for p in start.parents if p.is_dir()), Path.home())
        result = filedialog.askdirectory(parent=root, initialdir=str(start),
                                         title="Selecteer de Batch Text-logmap", mustexist=True)
        return str(Path(result)) if result else ""
    finally:
        root.destroy()


def register_batch_text_routes():
    """Register local Windows browse/status endpoints with the ComfyUI server."""
    try:
        from aiohttp import web
        from server import PromptServer
    except ImportError:
        return
    server = getattr(PromptServer, "instance", None)
    if server is None:
        return

    @server.routes.get("/valhalla/batch_text/log_folder_status")
    async def _status(request):
        folder = request.query.get("path", "")
        hint = request.query.get("workflow_hint", "")
        target = _effective_folder(folder, hint=hint)
        return web.json_response({"path": str(target), "exists": target.is_dir(),
                                  "automatic": _is_auto_folder(folder)})

    @server.routes.post("/valhalla/batch_text/choose_log_folder")
    async def _choose(request):
        if request.remote not in ("127.0.0.1", "::1"):
            return web.json_response({"error": "De Windows-mapkiezer is alleen via localhost toegestaan."}, status=403)
        try:
            data = await request.json()
            start = _effective_folder(data.get("initial_dir"), hint=data.get("workflow_hint", ""))
            selected = await asyncio.to_thread(_select_folder, start)
            return web.json_response({"path": selected, "cancelled": not bool(selected)})
        except Exception as exc:
            _LOGGER.exception("Batch Text mapkiezer mislukt")
            return web.json_response({"error": str(exc)}, status=500)


register_batch_text_routes()
