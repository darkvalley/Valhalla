# Batch Text — Overview

Valhalla Batch Text v1.5.1 merges native ComfyUI text values using Python's `delimiter.join(parts)`.

![Node overview](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/01-node-overview.svg)

## Connections

| Connection | Purpose |
| --- | --- |
| `☷ TEXT_LIST` | Optional native list of `STRING` items. A regular multiline string counts as one item. |
| `TEXT:0`, `TEXT:1`, ... | Dynamically added ordinary text inputs. Connecting the last free slot adds another. |
| `TEXT` | Single joined string output; connect to a prompt or text-preview node. |

## New: arrows control join order

Move inputs using the small **up/down arrows** beside eligible sockets. The **current top-to-bottom order** determines the order of the concatenated values. `TEXT_LIST` may be moved below, above or between the numbered inputs. The linked cables are retained, and the processing order is saved in `input_order` for Python execution.

See [Reordering Inputs](https://github.com/darkvalley/Valhalla/wiki/Reordering-Inputs) for a before/after example.

## Delimiters

Choose `None (direct)`, space, comma, semicolon, colon, pipe, tab, LF, CR, CRLF, blank line or `Custom`. Custom accepts literal text and supported escapes `\n`, `\r`, `\t` and `\\`. The delimiter is inserted **between each joined item**, including list elements.

Other behavior: duplicates are preserved; connected empty strings count as elements; the node does not parse or deduplicate JSON or paths.

## Attribution

Conceived and created by Werner de Jong. © 2026. MIT License.
