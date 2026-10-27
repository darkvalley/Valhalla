# Valhalla Batch Text v1.5.2 — UI and input-order fix

The node now displays a neat pair of boxed up/down arrow controls alongside each input row. Both native `TEXT_LIST` and connected numbered `TEXT:n` ports can be moved while keeping the original source cable and port name. The Python output respects the visible top-to-bottom order through the saved `input_order` value.

The last free `TEXT:n` socket is not part of the prompt and cannot be repositioned until connected. Disabled arrow buttons indicate unavailable actions. The node also automatically shrinks excess blank space after sockets are removed.

No workflow or engine configuration changes are required. Replace your existing `Valhalla_BatchText` folder, restart ComfyUI, and hard refresh (`Ctrl+Shift+R`).

© 2026 Werner de Jong — MIT License.
