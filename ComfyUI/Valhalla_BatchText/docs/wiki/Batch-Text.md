# Batch Text — Overview

Batch Text combines text inputs into **one `STRING`**, not a series of separate prompt executions. It performs the Python equivalent of `delimiter.join(parts)`.

![Node overview](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/01-node-overview.svg)

## Inputs and outputs

| Socket | What it does |
| --- | --- |
| `TEXT_LIST` | Optional input for a native ComfyUI list of `STRING` values. Its square/list styling differentiates it visually. |
| `TEXT:0`, `TEXT:1`, ... | Ordinary individual `STRING` connections. Connecting the last free socket adds another free socket automatically. |
| `TEXT` (output) | The single joined `STRING` result. Connect it to a text preview, prompt or system prompt input. |

### Order of operations

1. Read all values supplied through `TEXT_LIST` (if connected).
2. Append connected `TEXT:0`, `TEXT:1`, and subsequent numbered sockets in numeric order.
3. Join the resulting sequence with the selected delimiter and return a single `STRING`.

Unconnected sockets are ignored. Connected empty strings and repeated text are preserved; this node **does not deduplicate** or interpret prompts. No fixed maximum number of dynamic sockets is imposed by the extension, although practical browser and workflow limits still apply.

## On-node controls

`delimiter` selects standard separators including none, space, comma, semicolon, colon, pipe, tab, LF, CR, CRLF, blank line and Custom. `ⓘ Info` opens the English in-node help dialog.

## Credits

**Conceived and created by Werner de Jong.** © 2026 Werner de Jong. Free to use under the **MIT License**.
