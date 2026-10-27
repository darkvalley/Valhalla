# Reordering Inputs — New in v1.5.1

The **up/down arrows** beside the sockets change the order in which Batch Text processes values. The arrows do not simply change the appearance of the node: the Python backend receives the saved order.

![Reorder demo](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/05-reordering-inputs.svg)

## Step by step

1. Connect a native `STRING` list to `TEXT_LIST` (optional) and regular `STRING` values to `TEXT:0`, `TEXT:1`, etc.
2. Click the **down arrow (↓)** next to a socket to move it one position lower, or the **up arrow (↑)** to move it one position higher.
3. Watch the sockets and attached cables move together; ComfyUI does not connect them to a different source.
4. Save the workflow to retain the order, then queue it as usual.
5. Connect `TEXT` to a text preview to verify the resulting sequence.

## Example

`TEXT_LIST` contains `L1` and `L2`; `TEXT:0 = A`, `TEXT:1 = B`; `delimiter = Pipe (|)`.

| Visible order (top-to-bottom) | Result |
| --- | --- |
| `TEXT_LIST`, `TEXT:0`, `TEXT:1` | `L1|L2|A|B` |
| `TEXT:0`, `TEXT_LIST`, `TEXT:1` | `A|L1|L2|B` |
| `TEXT:0`, `TEXT:1`, `TEXT_LIST` | `A|B|L1|L2` |

**Important:** `TEXT_LIST` expands into its individual strings *at the position where its socket appears*. The delimiter is placed between every resulting item, not just between ports.

## Technical behavior

- The frontend updates the sockets' physical order, keeps link objects attached and updates LiteGraph `target_slot` indices.
- Numbered `TEXT:n` labels can change when inputs are moved. The last free `TEXT:n` is an unconnected placeholder and does not contribute output.
- The hidden `input_order` widget is serialized with the workflow and API prompt. Do not edit it manually.
- Older workflows without order metadata retain the old fallback order: `TEXT_LIST` first, then `TEXT:0`, `TEXT:1`, etc.
- If the ordering does not affect the output, ensure the installed node is **v1.5.1 or later**, restart ComfyUI, and hard-refresh the frontend.
