# Valhalla Batch Text v1.5.1

**Conceived and created by Werner de Jong. © 2026 Werner de Jong. MIT License.**

## New: Reorder input sockets

Click the arrows beside each eligible socket to change how its content is appended to the output. This also applies to `TEXT_LIST`: it may appear before, between or after numbered text inputs. The node retains the connected cables as they move and saves the resulting processing order in a hidden, API-serializable `input_order` value.

The v1.5.1 revision corrects an issue in v1.5.0 in which some ComfyUI installations did not send the visual order to the Python backend.

Older workflows continue to work: without saved order data, native list items are handled first and then numbered text inputs. The existing delimiter dropdown, Custom, Info dialog, and unlimited (practical resource limits permitting) dynamic text sockets remain available.

## Installation

Stop ComfyUI; replace `custom_nodes/Valhalla_BatchText` with the contents of the published folder `ComfyUI/Valhalla_BatchText`; restart and hard refresh (`Ctrl+Shift+R`). Do not clone the entire Valhalla repository into `custom_nodes`.

## Tests

23 Python unit tests and simulated frontend regression tests pass. A live ComfyUI integration test is still recommended.
