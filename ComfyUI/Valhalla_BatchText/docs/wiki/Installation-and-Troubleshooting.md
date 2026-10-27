# Installation and Troubleshooting — v1.5.3

## Manual installation (Windows)

1. Stop ComfyUI completely.
2. Download [darkvalley/Valhalla](https://github.com/darkvalley/Valhalla) outside the ComfyUI `custom_nodes` directory.
3. Copy only `ComfyUI/Valhalla_BatchText` into `custom_nodes/Valhalla_BatchText` of your ComfyUI installation, replacing the older version (back it up first).
4. Restart ComfyUI, then use `Ctrl+Shift+R` in your browser.
5. Add the `Batch Text` node under `Valhalla's Calling/Text`.

The custom node folder should contain `__init__.py`, `batch_text.py`, and `web/js/batch_text.js`. Do not copy the whole Valhalla repository into `custom_nodes`. No additional Python packages are needed.

The optional included PowerShell installer may be run from the source directory using the actual `-ComfyUIRoot` path.

## Troubleshooting

**No arrows / old interface:** confirm the installed files come from v1.5.3, restart ComfyUI and hard-refresh. Check that you do not have multiple installed copies of the node.

**Sockets move but output still has the old order:** v1.5.0 could fail to serialize the order on some frontends. Use **v1.5.3**, which preserves the hidden `input_order` widget and moves linked cable endpoints safely. Save a fresh workflow and test again.

**Inputs seem to change:** numbered `TEXT:n` ports may be renumbered after a move. Their cables remain connected to the original source.

**Info or delimiter overlaps inputs:** remove duplicate outdated extensions, restart and hard refresh.

**Output duplicates text:** Batch Text does not deduplicate. Check whether identical strings are connected more than once.

**Unexpected TEXT_LIST result:** a multiline string and a native ComfyUI list are not interchangeable.

## Attribution

Conceived and created by Werner de Jong. © 2026. MIT License.

**Port moves but cable still points to old row:** install v1.5.3 and fully restart ComfyUI; the revised link-store-safe movement uses a spare TEXT socket to reposition existing endpoints without disconnecting source links. Hard-refresh with `Ctrl+Shift+R`, and keep only one installed copy.
