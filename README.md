# Valhalla — ComfyUI custom nodes and visual tools

This repository hosts open-source components developed for the **Valhalla** creative workflow.

## ComfyUI Batch Text (v1.5.3)

A custom ComfyUI node that concatenates an optional native `STRING` list and unlimited dynamic individual text inputs, with a delimiter dropdown, custom separators, an English help popup, and up/down arrows that control the actual processing order of inputs. **In v1.5.3 the original source cables follow their reordered input ports**, including on modern ComfyUI link stores.

**[Source code, installation and English documentation](ComfyUI/Valhalla_BatchText/README.md)**  
**[Illustrated user guide and GitHub Wiki source](ComfyUI/Valhalla_BatchText/docs/README.md)** — diagrams, examples, reorder/cable-following instructions, and Wiki publishing guidance.  
**[Release notes v1.5.3](ComfyUI/Valhalla_BatchText/RELEASE_NOTES_v1.5.3.md)**

**Created by Werner de Jong.** © 2026 Werner de Jong. MIT License. The node has its own [`LICENSE`](ComfyUI/Valhalla_BatchText/LICENSE).

> **Installation note:** Clone or download the repository outside ComfyUI first. Copy the `ComfyUI/Valhalla_BatchText` folder into your ComfyUI `custom_nodes` directory, or use the included PowerShell installer. Do not clone the entire repository directly into `custom_nodes`.
