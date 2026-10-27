# Valhalla Batch Text v1.4.0 — English edition for ComfyUI

**Conceived and created by Werner de Jong.** © 2026 Werner de Jong.  
**Free to use — MIT License.** See [`LICENSE`](LICENSE) for the full terms.

## Overview

Batch Text joins an optional **native ComfyUI STRING list** and **any number of connected STRING inputs** into one `STRING` result. The join operation is performed in Python using `delimiter.join(parts)`.

This is the English-language update of v1.3.0. **The node class remains `ValhallaBatchText`**, so existing connections and workflows can be retained. The dropdown labels, tooltips, Info popup, installer messages, and documentation are in English. Older Dutch dropdown values are translated on workflow load where possible.

### Connectors

- **☷ TEXT_LIST** — Optional square input for a *native ComfyUI STRING list*. A node producing multiple STRING values with `OUTPUT_IS_LIST=(True,)` can feed this input. In Python, Batch Text receives lists because `INPUT_IS_LIST=True`. It is not a universal socket for arbitrary custom list types, and **a single multiline string is still one item**.
- **TEXT:0, TEXT:1, ...** — Ordinary STRING inputs. Connecting the last free input reveals another free input automatically. There is no hardcoded input limit; practical ComfyUI/browser limits still apply.
- **TEXT** — A single combined STRING output.

**Join order:** native `TEXT_LIST` items first, then `TEXT:0`, `TEXT:1`, etc. in numeric order. Unconnected inputs are ignored, but connected empty strings are included. Duplicate text is retained.

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

## Installation / upgrade

Choose one method, with **ComfyUI fully stopped**:

**Install from the Valhalla repository (recommended):** Clone to a temporary directory OUTSIDE `custom_nodes` and run the included installer. In Windows PowerShell:

```powershell
git clone https://github.com/darkvalley/Valhalla.git C:\TEMP\Valhalla
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\TEMP\Valhalla\ComfyUI\Valhalla_BatchText\Install-Valhalla-BatchText.ps1" -ComfyUIRoot "C:\PATH\TO\ComfyUI"
```

Change `-ComfyUIRoot` to your actual ComfyUI installation folder. The installer makes a backup **outside** `custom_nodes` so backups do not register duplicate nodes. Restart ComfyUI and hard-refresh with `Ctrl+Shift+R`.

**Manual installation:** Download the `darkvalley/Valhalla` repository as ZIP. Copy only its `ComfyUI/Valhalla_BatchText` folder into `ComfyUI/custom_nodes/Valhalla_BatchText/`. Do not put the whole Valhalla repository inside `custom_nodes`: the node must have `__init__.py` directly inside its own custom-node directory.

**Upgrading from prior versions:** Stop ComfyUI, preserve a backup of your existing workflow and custom node, and replace the old `Valhalla_BatchText` folder. Do not leave another active copy under a different name, because duplicate registration can cause conflicts.

The published folder layout is:

```text
Valhalla/ComfyUI/Valhalla_BatchText/
├── __init__.py
├── batch_text.py
├── web/js/batch_text.js
├── LICENSE
├── README.md
├── CHANGELOG.md
├── Install-Valhalla-BatchText.ps1
└── tests/
```

No external Python packages are required.

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
7. Open **ⓘ Info**; verify that all instructions and the **Close** button are in English.
8. Save and reload the workflow, then confirm its selected delimiter remains correct.

## Developer tests

From the repository root:

```powershell
python -m unittest discover -s tests -p test_batch_text.py -v
node .\tests\test_dynamic_ui.cjs
```

The Python suite checks separators, list handling, output order, large input counts, and Dutch-label compatibility. The JavaScript suite simulates LiteGraph to check dynamic connectors, popup text, widget placement, and workflow migrations. **These are not substitutes for a live ComfyUI test.**

## Troubleshooting

- **Dropdown still shows Dutch:** ensure the old `Valhalla_BatchText` folder was replaced, restart ComfyUI, and hard-refresh your browser with Ctrl+Shift+R.
- **Missing node:** check the ComfyUI console for an `IMPORT FAILED` message and confirm the directory under `custom_nodes`.
- **Custom field not appearing:** choose **Custom** in the new dropdown; if necessary, restart and refresh the browser to load the new frontend extension.
- **Extra TEXT connector:** this is the next free connection point; it is intentional.
- **Repeated content:** Batch Text does not remove duplicates; inspect whether identical strings are connected twice.
- **Old workflow shows an incorrect separator:** manually select the matching English preset (or Custom) and save a new copy of the workflow.

## License

Conceived and created by **Werner de Jong**. Copyright © 2026 Werner de Jong. **MIT License** — free for personal and commercial use; retain the copyright and license notice when redistributing. No warranty is provided.
