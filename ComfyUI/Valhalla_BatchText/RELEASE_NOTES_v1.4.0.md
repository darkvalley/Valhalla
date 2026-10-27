# v1.4.0 — English Edition

Initial GitHub publication of **Valhalla Batch Text** for ComfyUI.

- Unlimited dynamically growing `TEXT:n` input sockets and one `STRING` output.
- Optional native `TEXT_LIST` input for ComfyUI STRING lists.
- Separator dropdown (none, space, comma, semicolon, colon, pipe, tab, LF, CR, CRLF, blank line) with custom text input.
- Built-in Info popup with usage help and author attribution.
- Backward-compatible Python node class (`ValhallaBatchText`), plus best-effort migration of older Dutch dropdown labels.
- MIT license. Conceived and created by Werner de Jong, © 2026.

Tests: Python unit tests and simulated LiteGraph frontend tests. **Not yet live-tested on the user's current local ComfyUI version.**
