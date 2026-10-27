# Installation and Troubleshooting

## Windows installation

1. Shut down ComfyUI completely.
2. Download or clone [darkvalley/Valhalla](https://github.com/darkvalley/Valhalla) **outside** ComfyUI's `custom_nodes` folder.
3. Copy only `ComfyUI/Valhalla_BatchText/` to `<ComfyUI>/custom_nodes/Valhalla_BatchText/`. The custom node directory must contain `__init__.py`.
4. Restart ComfyUI, then hard-refresh the browser (`Ctrl+Shift+R`).
5. Search the Add Node menu for **Batch Text** (category `Valhalla's Calling`).

Alternatively, run `Install-Valhalla-BatchText.ps1` from the node's published folder, passing your actual ComfyUI root via `-ComfyUIRoot`. The script backs up a previous installation outside `custom_nodes`.

```powershell
git clone https://github.com/darkvalley/Valhalla.git C:\TEMP\Valhalla
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\TEMP\Valhalla\ComfyUI\Valhalla_BatchText\Install-Valhalla-BatchText.ps1' -ComfyUIRoot 'C:\PATH\TO\ComfyUI'
```

## Troubleshooting

**Node does not appear:** Verify the installation folder contains `__init__.py` directly. Restart ComfyUI and refresh the browser cache.

**Delimiter and Info button overlap sockets:** Confirm that only the latest JS extension is installed, remove duplicate copies of the custom node, restart and hard-refresh.

**Double paths or instructions in output:** Check whether two inputs contain the same text. Batch Text preserves duplicates by design.

**TEXT_LIST produces surprising results:** Check whether upstream node emits a native ComfyUI STRING list or one multiline STRING. The two are different.

**Old Dutch labels:** Version 1.4 migrates supported previous selections; if a preset displays incorrectly, select its English equivalent and save a fresh workflow copy.

**No external Python dependencies are required.** The frontend extension is bundled with the node.

## Source and license

[Source code and original README](https://github.com/darkvalley/Valhalla/tree/main/ComfyUI/Valhalla_BatchText) · [MIT License](https://github.com/darkvalley/Valhalla/blob/main/ComfyUI/Valhalla_BatchText/LICENSE)
