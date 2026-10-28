# Installation and Troubleshooting — v1.5.4

## Manual installation (Windows)

1. Stop ComfyUI completely.
2. [Download the official v1.5.4 installation ZIP](https://github.com/darkvalley/Valhalla/releases/download/v1.5.4/Valhalla_BatchText_v1.5.4.zip).
3. Unzip it and copy the included `Valhalla_BatchText` folder into your ComfyUI installation's `custom_nodes` directory, backing up or replacing an earlier version.
4. Restart ComfyUI, then use `Ctrl+Shift+R` in your browser.
5. Add the `Batch Text` node under `Valhalla's Calling/Text`.

Alternatively, download the full [Valhalla repository](https://github.com/darkvalley/Valhalla) outside `custom_nodes` and copy only its `ComfyUI/Valhalla_BatchText` folder.

The custom node folder should contain `__init__.py`, `batch_text.py`, and `web/js/batch_text.js`. Do not copy the whole Valhalla repository into `custom_nodes`. No additional Python packages are needed.

The optional included PowerShell installer may be run from the source directory using the actual `-ComfyUIRoot` path.

## Troubleshooting

**No arrows / old interface:** confirm the installed files come from v1.5.4, restart ComfyUI and hard-refresh. Check that you do not have multiple installed copies of the node.

**Sockets move but output still has the old order:** v1.5.0 could fail to serialize the order on some frontends. Use **v1.5.4**, which preserves the hidden `input_order` widget and moves linked cable endpoints safely. Save a fresh workflow and test again.

**Inputs seem to change:** connected `TEXT:n` ports retain their names and original source cables when moved. Check the displayed top-to-bottom order against your text preview.

**Info or delimiter overlaps inputs:** remove duplicate outdated extensions, restart and hard refresh.

**Output duplicates text:** Batch Text does not deduplicate. Check whether identical strings are connected more than once.

**Unexpected TEXT_LIST result:** a multiline string and a native ComfyUI list are not interchangeable.

## Attribution

Conceived and created by Werner de Jong. © 2026. MIT License.

**Port moves but cable still points to old row:** install v1.5.4 and fully restart ComfyUI; the revised link-store-safe movement uses a spare TEXT socket to reposition existing endpoints without disconnecting source links. Hard-refresh with `Ctrl+Shift+R`, and keep only one installed copy.

**Selected port order resets after restarting ComfyUI:** update to v1.5.4, restart ComfyUI, hard-refresh the browser, select your desired order and save the workflow again. After reopening, the socket order and original cables should persist.
