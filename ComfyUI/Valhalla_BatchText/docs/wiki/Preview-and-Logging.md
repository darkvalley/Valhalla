# Preview and Logging — v1.6.3

Batch Text has two **independent** optional features: a read-only text preview and complete daily logs. Both are off by default.

## Preview

Enable `show_preview` to see the complete combined output within the node, up to the `max_chars` display limit (default: 200,000 characters; configurable to 2,000,000). Resizing the node also resizes the preview. The actual TEXT output is never truncated.

## Logging

Enable `write_log` to append the **full** combined text each time Batch Text runs. You do **not** need to turn on `show_preview`.

### File naming

Each workflow gets one file **per day**:

`<workflow_name>_YYYYMMDD.txt`

For example: `panel_creation_20261116.txt`.

Every execution of every Batch Text node in the same workflow on that date appends another entry to the same file:

~~~text
------------------------------------------------------------------
ValhallaBatchText - LoggingFirstPrompt 20261116 22:43:12


moss_xvstyle

Prompt content...


------------------------------------------------------------------
ValhallaBatchText - PromptTwo 20261116 22:48:10


More combined text...


~~~

The entry includes the node's visible title and local ComfyUI-server date/time. After midnight the first run creates the next day's file automatically. Previous files are never renamed or deleted.

### Choosing a log folder

With `write_log` enabled, use **Choose log folder...** or enter a valid directory. Batch Text writes to that existing folder, does not create missing folders, and records the location in the saved widget and `properties.valhalla_batch_text_log_folder`.

When left empty, Batch Text attempts to use the saved workflow's directory. If the workflow's location cannot be resolved, it falls back to the configured `user/default/workflows` directory.

The native folder picker requires a Windows ComfyUI server accessed on localhost. For remote or non-Windows installations, enter an existing path manually.

**After upgrading:** If an earlier frontend version already discarded the chosen path, select the folder once again and save the workflow. v1.6.3 then restores it automatically on reload.

## Troubleshooting

- **No log:** ensure `write_log` is on, the folder exists and ComfyUI can write to it.
- **New file for every run:** verify you are reading the Batch Text log and not a separate ValhallaTextStudio Text Inspector log. The latter uses an independent logger and is not changed by this release.
- **Missing preview:** turn on `show_preview`, execute the workflow, and check the connections.
- **Old UI:** remove duplicate node installations, restart ComfyUI and hard-refresh the browser.

[Batch Text](Batch-Text) · [Installation and Troubleshooting](Installation-and-Troubleshooting).
