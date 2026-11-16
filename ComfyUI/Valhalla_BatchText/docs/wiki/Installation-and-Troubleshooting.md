# Installation and Troubleshooting — v1.6.3

## Install on ComfyUI

1. Stop the ComfyUI server.
2. Download [Valhalla Batch Text v1.6.3 (ZIP)](https://github.com/darkvalley/Valhalla/releases/download/v1.6.3/Valhalla_BatchText_v1.6.3.zip).
3. Back up any previous `custom_nodes/Valhalla_BatchText` folder.
4. Extract the ZIP into `custom_nodes`, so the file `custom_nodes/Valhalla_BatchText/__init__.py` exists.
5. Restart ComfyUI and hard-refresh the browser with `Ctrl+F5` or `Ctrl+Shift+R`.
6. Add **Batch Text** from `Valhalla's Calling/Text`.

The install folder must include `batch_text.py`, `__init__.py`, `web/js/batch_text.js` and `web/js/batch_text_inspector.js`. No additional Python dependencies are required. Do not extract the entire Valhalla GitHub repository into `custom_nodes`.

## Common issues

**Port labels show TEXT:0 rather than scene_text.** Ensure the input is connected to a source output with a name. Verify v1.6.3 is installed and there is no second older copy. The actual input name is intentionally `TEXT:n`.

**My manual slot name disappeared.** Use **Rename Slot**, save the workflow and reload. v1.6.3 stores these names separately in workflow properties.

**Log folder reset after upgrade.** Choose the folder again if an older workflow had already lost its path, then save. v1.6.3 persists `properties.valhalla_batch_text_log_folder` and restores it on reload.

**Multiple timestamped files per run.** Batch Text now uses one `<workflow>_YYYYMMDD.txt` log. Another custom node called ValhallaTextStudio uses a separate logger; this release does not update it.

**No log output.** Enable `write_log`, confirm the folder is writable, and inspect any error tooltip. Preview can remain disabled.

**Wrong text order or rerouted cables.** Use the input up/down arrows and save the workflow. After upgrading, restart the server and browser fully.

**TEXT_LIST surprises.** A multiline STRING is one value, while a native list supplies separate values to the joiner.

**Preview blank or improperly sized.** Turn on `show_preview`, run the workflow, and make sure both frontend JavaScript and backend Python belong to v1.6.3.

[Batch Text](Batch-Text) · [Preview and Logging](Preview-and-Logging) · [Input Labels](Automatic-and-Manual-Input-Labels).
