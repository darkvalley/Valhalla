# Valhalla Batch Text v1.5.3 — English edition for ComfyUI

**Conceived and created by Werner de Jong.** © 2026 Werner de Jong.  
**Free to use — MIT License.** See [`LICENSE`](LICENSE) for the full terms.

**[Download the official v1.5.3 release](https://github.com/darkvalley/Valhalla/releases/tag/v1.5.3)** · [Download the installable ZIP](https://github.com/darkvalley/Valhalla/releases/download/v1.5.3/Valhalla_BatchText_v1.5.3.zip)

## Overview

Batch Text joins an optional **native ComfyUI STRING list** and **any number of connected STRING inputs** into one `STRING` result. The join operation is performed in Python using `delimiter.join(parts)`.

This release corrects link endpoints during input reordering while retaining the English interface and older-workflow compatibility. **The node class remains `ValhallaBatchText`**, so existing connections and workflows can be retained. The dropdown labels, tooltips, Info popup, installer messages, and documentation are in English. Older Dutch dropdown values are translated on workflow load where possible.

### Connectors

- **☷ TEXT_LIST** — Optional square input for a *native ComfyUI STRING list*. A node producing multiple STRING values with `OUTPUT_IS_LIST=(True,)` can feed this input. In Python, Batch Text receives lists because `INPUT_IS_LIST=True`. It is not a universal socket for arbitrary custom list types, and **a single multiline string is still one item**.
- **TEXT:0, TEXT:1, ...** — Ordinary STRING inputs. Connecting the last free input reveals another free input automatically. There is no hardcoded input limit; practical ComfyUI/browser limits still apply.
- **TEXT** — A single combined STRING output.

**Join order:** the **current top-to-bottom order of the connected sockets**, including `TEXT_LIST` when present. Move any eligible input using the arrow controls beside the socket. A `TEXT_LIST` expands to its individual items at its position in this order. Unconnected inputs are ignored, but connected empty strings are included. Duplicate text is retained.

## Reordering inputs — v1.5.3 cable-follow fix

**The order shown on the node determines the Python join order.** Every input row has a matching pair of outlined **↑ / ↓ buttons**.

**v1.5.3 cable fix:** When moving a connected socket, the **existing cable endpoint visibly moves with that named socket**. Connections are not recreated, and source links/reroutes are preserved. To swap two connected rows safely, the extension temporarily moves one link endpoint into the spare unconnected `TEXT:n` slot before completing the swap. This accommodates current ComfyUI versions that reject reassigning a link to an already-occupied input. It also works with earlier LiteGraph implementations. The `input_order` value updates to match the resulting vertical positions.

**Validated release:** The cable-follow fix passed automated Python and simulated legacy/modern ComfyUI frontend tests, and was confirmed working in a local ComfyUI workflow by the project owner on 27 October 2026. Click an enabled arrow on a connected socket to move it relative to other inputs. This changes the **processing order**, not merely how the node looks.

- `TEXT_LIST` is also movable; it no longer has to contribute its items first.
- The existing cable **remains attached to the same source** when its socket moves. Connected numbered sockets **keep their own `TEXT:n` labels** when moved. For example, `TEXT:1` can appear above `TEXT:0` without changing either cable.
- The final unconnected `TEXT:n` socket is reserved for a new connection. Its arrow buttons are disabled until it is connected; disabled arrows are also shown at the beginning/end of the movable range.
- The chosen order is saved in the workflow through a hidden `input_order` value and serialized for API execution. Do not edit this value manually.
- Workflows saved with older node versions have a compatible fallback: `TEXT_LIST` first, then numbered `TEXT:n` slots.
- The `delimiter` remains applied **between every item** of the joined sequence.

**Example:** `TEXT:0 = A`, `TEXT_LIST = [L1, L2]`, `TEXT:1 = B`, with delimiter `Pipe (|)`.

| Visual top-to-bottom order | Output |
| --- | --- |
| `TEXT_LIST`, `TEXT:0`, `TEXT:1` | `L1|L2|A|B` |
| `TEXT:0`, `TEXT_LIST`, `TEXT:1` | `A|L1|L2|B` |
| `TEXT:0`, `TEXT:1`, `TEXT_LIST` | `A|B|L1|L2` |

![Reordering inputs demonstration](docs/images/05-reordering-inputs.svg)

For more examples, see the [illustrated documentation](docs/README.md) or [reordering guide](docs/wiki/Reordering-Inputs.md).

## Delimiter dropdown

| Selection | Actual separator |
| --- | --- |
| `None (direct)` | Empty string (direct concatenation) |
| `Space ( )` | Single space |
| `Comma (, )` | Comma followed by a space |
| `Comma (,)` | Comma |
| `Semicolon (; )` | Semicolon followed by a space |
| `Semicolon (;)` | Semicolon |
| `Colon (: )` | Colon followed by a space |
| `Colon (:)` | Colon |
| `Pipe ( \| )` | Space + pipe + space |
| `Pipe (\|)` | Pipe |
| `Tab (\t)` | Tab control character |
| `LF (\n)` | Line feed (U+000A) |
| `CR (\r)` | Carriage return (U+000D) |
| `CRLF (\r\n)` | Windows-style line ending |
| `Blank line (\n\n)` | Two line-feed characters |
| `Custom` | Any text entered in `custom_delimiter` |

**Custom** reveals the `custom_delimiter` field. You can type any literal text, emoji, punctuation, spaces, or actual line breaks. The following typed escapes are also supported: `\n` for LF, `\r` for CR, `\t` for tab, and `\\` for a literal backslash. To insert the two literal characters `\n`, type `\\n`. Unknown escapes such as `\q` are left unchanged. An empty Custom separator joins directly.

**Example:** `TEXT:0 = "Mara"`, `TEXT:1 = "Greek dress"`, `delimiter = Comma (, )` produces `Mara, Greek dress`.

The **ⓘ Info** button opens an English help dialog, including examples, an explanation of the list port, and the author / MIT-license attribution.

## Manual installation / upgrade

1. Stop ComfyUI. Back up your current workflow JSON and the existing `Valhalla_BatchText` directory.
2. Extract the ZIP and copy **only** `Valhalla_BatchText` to your existing ComfyUI `custom_nodes` folder, replacing the old directory. Do not leave duplicate active copies of this node.
3. Verify that `__init__.py`, `batch_text.py` and `web/js/batch_text.js` are directly inside the installed node folder.
4. Restart ComfyUI and hard-refresh your browser with `Ctrl+Shift+R`.

Example directory for the Valhalla Windows setup:

`C:\AI-Engines\LLM-engines\ComfyUI\ComfyUI\ComfyUI\custom_nodes\Valhalla_BatchText`

For the repository source, see [darkvalley/Valhalla](https://github.com/darkvalley/Valhalla/tree/main/ComfyUI/Valhalla_BatchText). **Do not clone the complete Valhalla repository directly into `custom_nodes`.**

Folder layout:

```text
Valhalla_BatchText/
├── __init__.py
├── batch_text.py
├── LICENSE
├── README.md
├── CHANGELOG.md
├── web/js/batch_text.js
└── tests/
```

No external Python packages are required. This extension uses the same node class name as v1.0–v1.5.2.

## Compatibility with older workflows

- **Node class:** unchanged, `ValhallaBatchText`.
- **Text connectors:** unchanged (`TEXT:n`, `TEXT_LIST`, and `TEXT`).
- **Old Dutch dropdown labels:** the frontend recognizes Dutch values saved in v1.2/v1.3 workflows and changes them to the equivalent English selection when the workflow is loaded (for example, `Lege regel (\n\n)` → `Blank line (\n\n)`). Custom text is preserved.
- **Older literal delimiters:** the node also attempts to migrate the pre-dropdown v1.0/v1.1 format, including literal backslashes.
- **Python layer:** still recognizes Dutch preset labels and older raw separators for direct function calls. **However, ComfyUI may reject old API-format prompts with Dutch combo values at schema validation before calling Python.** For those API JSON files, use the English dropdown values, or load and re-save a UI workflow after checking its separator.

**Back up your workflow JSON before saving it with a new node version.** Frontend migration has been tested in a simulated LiteGraph environment, but not on your specific ComfyUI installation.

## Quick verification

1. Connect `ABC` to `TEXT:0`, `DEF` to `TEXT:1`, and the `TEXT` output to `Preview as Text`.
2. Select **None (direct)** → `ABCDEF`.
3. Select **Comma (, )** → `ABC, DEF`.
4. Select **LF (\n)** → two separate lines.
5. Select **CRLF (\r\n)** → the output contains the exact CR+LF sequence.
6. Select **Custom**, enter ` <> ` → `ABC <> DEF`.
7. Connect a native `TEXT_LIST`, `TEXT:0` and `TEXT:1`; use the outlined arrows to move `TEXT:1` above `TEXT:0` and move `TEXT_LIST` between them. Confirm the output follows the visual order.
8. Save and reload; verify the reordered sockets and original attached cables remain correct.
9. Open **ⓘ Info**; verify that all instructions and the **Close** button are in English.
10. Confirm the selected delimiter remains correct after reload.

## Developer tests

From the repository root:

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
node .\tests\test_dynamic_ui.cjs
```

The Python suite checks separators, list handling, saved output order, large input counts, and Dutch-label compatibility. The JavaScript suite simulates both legacy LiteGraph and the newer ComfyUI link-store rules. It checks collision-free cable moves, original link IDs and sources, stable socket labels, arrow rendering, saved input order, dynamic connectors, widget placement, the popup, and workflow migration. **These are not substitutes for a live ComfyUI test.**

## Troubleshooting

- **Dropdown still shows Dutch:** ensure the old `Valhalla_BatchText` folder was replaced, restart ComfyUI, and hard-refresh your browser with Ctrl+Shift+R.
- **Missing node:** check the ComfyUI console for an `IMPORT FAILED` message and confirm the directory under `custom_nodes`.
- **Custom field not appearing:** choose **Custom** in the new dropdown; if necessary, restart and refresh the browser to load the new frontend extension.
- **Extra TEXT connector:** this is the next free connection point; it is intentional.
- **Repeated content:** Batch Text does not remove duplicates; inspect whether identical strings are connected twice.
- **Old workflow shows an incorrect separator:** manually select the matching English preset (or Custom) and save a new copy of the workflow.

## License

Conceived and created by **Werner de Jong**. Copyright © 2026 Werner de Jong. **MIT License** — free for personal and commercial use; retain the copyright and license notice when redistributing. No warranty is provided.
