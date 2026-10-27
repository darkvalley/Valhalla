# v1.5.1 — Reorderable Inputs (27 October 2026)

- Add up/down controls for changing the top-to-bottom processing order of connected `TEXT:n` inputs and `TEXT_LIST`.
- Preserve attached cables while moving sockets and update the stored LiteGraph `target_slot` pointers.
- Persist the actual join order in the hidden, prompt-serializable `input_order` value (v1.5.1 fix).
- Preserve old workflows using a compatible default order when no saved order is present.
- Keep the delimiter dropdown, dynamic input generation, native `TEXT_LIST` support and English Info popup.
- Add regression tests for reordered output, saved order, and stable source links.

# Changelog — Valhalla Batch Text

## v1.4.0 — English user interface (2026-10-27)

- English delimiter dropdown, Custom option, tooltips, and Info dialog (including **Close**).
- English installation messages and documentation (`README_EN.md`).
- Preserved the `ValhallaBatchText` class, dynamic `TEXT:n` sockets, optional `TEXT_LIST` port, one STRING output, and Python joining behavior.
- Added best-effort conversion of old Dutch dropdown values to English when loading UI workflows. Python also accepts legacy Dutch labels for compatibility.
- Preserved the MIT license and the credit: conceived and created by Werner de Jong.
- Extended automated tests for English labels, Dutch-to-English migration, and help-dialog content.

## v1.3.0 — Native text-list input (2026-10-27)

- Added the optional square `☷ TEXT_LIST` input alongside dynamic `TEXT:n` sockets.
- Implemented native ComfyUI list support using `INPUT_IS_LIST=True`.
- List items join first, followed by individual text sockets in numeric order.
- Updated popup, layout, and unit tests. No automatic duplicate removal.

## v1.2.1 — Dynamic widget positioning (2026-10-27)

- Repositioned delimiter and Info widgets below the growing socket list.
- Updated layout on connection, disconnection, and workflow restoration.

## v1.2.0 — Separator presets (2026-10-27)

- Added delimiter selection presets (including LF, CR, CRLF, and blank line).
- Added a conditional multiline Custom delimiter with supported escape sequences.
- Included a best-effort migration from older raw separators.

## v1.1.0 — Info button (2026-10-27)

- Added the Info popup with instructions, copyright notice, and MIT license attribution.

## v1.0.0 — Initial release (2026-10-27)

- Python text joining and automatically growing `TEXT:n` inputs.
