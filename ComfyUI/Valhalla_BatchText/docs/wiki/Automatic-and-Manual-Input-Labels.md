# Automatic and Manual Input Labels — v1.6.3

## Automatic names from connected outputs

When you connect `TheEmpirePanelRef.scene_text` to Batch Text's `TEXT:0` input, the visible input label automatically becomes **scene_text**. If the source output has its own custom display label, that visible label is preferred over its technical output name.

The source name is shown **only as a label**. Batch Text continues to send `TEXT:0` in ComfyUI's API payload and uses the unchanged socket ID when assembling the prompt. This avoids breaking existing workflows.

## Manual labels take precedence

1. Right-click the dynamic input socket.
2. Choose **Rename Slot**.
3. Enter your preferred name, for example `opening_scene`.
4. Save the workflow.

The chosen name persists after new cable connections, moving a socket up/down, reopening the workflow and restarting ComfyUI. An automatic source label does not overwrite an explicitly chosen manual label.

To **return to automatic naming**, rename the slot back to its original technical name, such as `TEXT:0`. On the next refresh or connection update, Batch Text displays the connected source output's name again.

## What stays unchanged?

- Internal IDs: `TEXT:0`, `TEXT:1`, ... (these are never renamed automatically).
- `TEXT_LIST` remains the list socket with its list icon.
- Cable source IDs, physical input ordering and serialized workflow joins are preserved.
- Prior saved manual labels are migrated where the original label data is available.

If manual labels appear to reset, verify that you installed **v1.6.3**, have only one copy of the node, restarted ComfyUI and saved the workflow after renaming.

[Batch Text overview](Batch-Text) · [Reordering Inputs](Reordering-Inputs) · [Installation](Installation-and-Troubleshooting).
