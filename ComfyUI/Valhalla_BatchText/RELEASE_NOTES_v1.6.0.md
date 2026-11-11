# Valhalla Batch Text v1.6.0 — Integrated Text Inspector

**Release date:** 11 November 2026  
**Author:** Werner de Jong  
**License:** MIT

## New features

- **Integrated Text Inspector:** the existing Batch Text node now optionally displays its complete combined text directly inside the node. No separate inspector node is needed.
- **Show Preview (default OFF):** keeps existing workflows compact. Turning it on reveals the read-only preview, character counter and max_chars.
- **Flexible, resizable preview:** the preview expands and contracts with the node, with no unused grey area below it.
- **Info icon:** the help dialog is available from the small circled i at the top right instead of a separate button underneath the preview.
- **max_chars:** preview display limit of 100–2,000,000 characters (default 200,000); the output TEXT and logs are never truncated by this setting.
- **Write Log (default OFF):** when enabled, the stored log folder field and single **Choose log folder...** button become visible. Disabling logging hides them while keeping the node size.
- **Cumulative UTF-8 logs:** append the full combined text to a workflow-specific timestamped log file with multiple entries per workflow execution when run metadata is available.
- **Workflow-folder default:** when no destination is specified, use the saved workflow's folder if available, otherwise ComfyUI's configured user/default/workflows directory. User-selected browse folders persist across saved workflows.
- **Local Windows folder picker:** native dialog launched on the ComfyUI server via a localhost-only endpoint; non-Windows and remote instances can enter an existing folder path manually.

## Fixes and compatibility

- Corrected initial preview refresh after execution, including cached output and the API execution-event fallback.
- Fixed preview height allocation and one-way resize: users can make the node both larger and smaller.
- Removed the Info row overlapping the preview and the large unused area when resizing.
- Fixed unexpected node height changes when switching Write Log.
- Preserved the original node identifier ValhallaBatchText and display name Batch Text.
- Preserved TEXT_LIST, dynamic TEXT:n inputs, original cable identities, input ordering, delimiters, custom separators, and the existing single TEXT output.
- Preview and logging are disabled by default for backward-compatible workflow behavior.
- Standardized the folder chooser label in English: Choose log folder...

## Validation

- The owner confirmed the v1.5.8 release candidate works interactively in their local ComfyUI (including preview resize and the new header Info icon).
- 36 Python backend tests and four JavaScript regression suites passed against the local approved code.
- The production v1.6.0 release retains the approved runtime implementation with updated version markers and English documentation.
- A separate live test of the production checkout has not been performed in this release step.

## Install / update

Install only the ComfyUI/Valhalla_BatchText directory into your ComfyUI custom_nodes folder, replacing the prior version. Restart ComfyUI and hard-refresh the browser (Ctrl+F5). Avoid duplicate installations.

**Source:** https://github.com/darkvalley/Valhalla/tree/main/ComfyUI/Valhalla_BatchText  
**Wiki:** https://github.com/darkvalley/Valhalla/wiki/Preview-and-Logging

Note: pushing code to GitHub does not automatically publish a Comfy Registry version. The Registry publisher workflow is a separate manual action.
