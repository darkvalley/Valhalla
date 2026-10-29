# Valhalla — ComfyUI custom nodes and visual tools

This repository hosts open-source components developed for the **Valhalla** creative workflow.

## ComfyUI Batch Text (v1.5.4)

A custom ComfyUI node that concatenates an optional native `STRING` list and unlimited dynamic individual text inputs, with a delimiter dropdown, custom separators, an English help popup, and up/down arrows that control the actual processing order of inputs. **In v1.5.4 the selected input order and its original cables are restored after saving, reloading or restarting ComfyUI**, including on modern link stores.

**[Official v1.5.4 release (ZIP download)](https://github.com/darkvalley/Valhalla/releases/tag/v1.5.4)** · [Direct ZIP](https://github.com/darkvalley/Valhalla/releases/download/v1.5.4/Valhalla_BatchText_v1.5.4.zip)

**[Source code, installation and English documentation](ComfyUI/Valhalla_BatchText/README.md)**  
**[Illustrated user guide and GitHub Wiki source](ComfyUI/Valhalla_BatchText/docs/README.md)** — diagrams, examples, reorder/cable-following instructions, and Wiki publishing guidance.  
**[Release notes v1.5.4](ComfyUI/Valhalla_BatchText/RELEASE_NOTES_v1.5.4.md)**

**Created by Werner de Jong.** © 2026 Werner de Jong. MIT License. The node has its own [`LICENSE`](ComfyUI/Valhalla_BatchText/LICENSE).

> **Installation note:** Clone or download the repository outside ComfyUI first. Copy the `ComfyUI/Valhalla_BatchText` folder into your ComfyUI `custom_nodes` directory, or use the included PowerShell installer. Do not clone the entire repository directly into `custom_nodes`.

## Comfy Registry publishing (maintainers)

The Comfy Registry package is prepared from [`ComfyUI/Valhalla_BatchText`](ComfyUI/Valhalla_BatchText) using its `pyproject.toml` manifest and `.comfyignore`. Only this custom node is packaged; the Valhalla repository as a whole is not an installable node package.

To publish an approved stable version, create the GitHub Actions repository secret `REGISTRY_ACCESS_TOKEN` with your Comfy Registry **Publishing API Key**. Confirm the `PublisherId` in `pyproject.toml` matches your Registry publisher (currently configured as `darkvalley`). Open **Actions > Publish Valhalla Batch Text to Comfy Registry > Run workflow** and select the approved `main` revision. The workflow runs Python and JavaScript regression tests, validates Registry metadata, checks the package contents and then publishes with the release notes.

**Publishing is manual only.** Adding metadata or pushing code does not itself publish a Registry version. Registry versions cannot be overwritten; update `[project].version` and the release-notes filename in the workflow for later approved versions.
