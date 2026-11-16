# Batch Text — Overview (v1.6.3)

Valhalla Batch Text is an expandable ComfyUI text joiner with a native list input, reorderable individual text inputs and an optional integrated inspector.

## Ports

| Port | Meaning |
| --- | --- |
| `☷ TEXT_LIST` | Optional native STRING list; each list element is joined separately |
| `TEXT:0`, `TEXT:1`, ... | Individual STRING inputs; a new free socket is created automatically |
| `TEXT` | The complete joined string, suitable for prompts or other text nodes |

**New:** Connected inputs display the source output's visible name, such as `scene_text`. This is only a display label; the internal port ID is still `TEXT:0`. Manual names made with **Rename Slot** take precedence and persist. See [Automatic and Manual Input Labels](Automatic-and-Manual-Input-Labels).

## Combining and ordering

Choose a delimiter (none, space, comma, semicolon, colon, pipe, tab, line break, blank line, or custom). The delimiter separates individual items, including elements of `TEXT_LIST`. The up/down buttons change processing order and move the original connected cables with their ports. The selected order survives saving and reloading the workflow.

## Optional inspection

- `show_preview` displays the combined text read-only with a character counter and resizable preview.
- `max_chars` limits only the visual preview; the TEXT output is always complete.
- `write_log` writes the complete text to a daily workflow file, even if preview is turned off.
- `log_folder` can be set with the folder chooser and is saved with the workflow.

For details, see [Preview and Logging](Preview-and-Logging) and [Reordering Inputs](Reordering-Inputs).

## Compatibility

Saved connection IDs, `TEXT:n` identifiers, the optional native list, output contract and previous delimiters remain compatible with older saved ComfyUI workflows.

© 2026 Werner de Jong · MIT License.
