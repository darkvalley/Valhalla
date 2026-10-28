# Changelog

## v1.5.4 — saved port order survives restart (28 October 2026)

- Fix [issue #1](https://github.com/darkvalley/Valhalla/issues/1): reordered input ports no longer revert to default after saving, reopening or restarting ComfyUI.
- Restore saved `TEXT_LIST` and `TEXT:n` socket positions with their original cables.
- Persist socket order in workflow metadata and the hidden `input_order` widget; preserve older workflows and Python joining semantics.
- Add restart/reload regression tests. Confirmed in a local ComfyUI workflow by the project owner on 28 October 2026.


## v1.5.3 — cable-follow reorder fix (27 October 2026)

- Fix link-target collisions when two *connected* input sockets are exchanged on recent ComfyUI frontends using a central link store.
- Move existing cable endpoints through the spare unconnected `TEXT:n` socket, then swap the complete input slot objects. Existing link IDs, source nodes, and reroute chains are preserved.
- Change the slot layout through one reactive array splice so the interface and connection endpoints follow the selected order.
- Detect rejected endpoint moves and abort instead of applying a misleading visual-only swap.
- Add regression coverage modelling newer ComfyUI's target-occupancy index and read-only `input.link` properties.
- Keep the Python joiner, delimiters, TEXT_LIST semantics, MIT license and node class unchanged.

# v1.5.2 — Input reordering UI and text-input bug fix (27 October 2026)

- Draw two aligned, outlined arrow buttons on every `TEXT_LIST` and `TEXT:n` row, consistent with the published interface illustrations.
- Fix a processing-order bug when swapping two ordinary `TEXT:n` inputs: their **original names and attached cables** stay with the moved sockets instead of being renumbered after the move.
- Keep the saved `input_order` value in sync with physical row order so the Python join operation follows what the user sees.
- Show disabled arrows for the first/last available positions and the unused free input.
- Prevent stale node heights from leaving large blank areas after disconnecting inputs.
- Extend JS simulation tests for moving two ordinary TEXT inputs, link target-slot remapping, and rendering per-row buttons.
- Keep the node class and types unchanged. Manual installation; no workflow files supplied.

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
