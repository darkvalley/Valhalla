# Valhalla Batch Text v1.5.3 — Cable Follow Fix

**Released:** 27 October 2026  
**Author:** Werner de Jong  
**License:** MIT

The owner validated the v1.5.3 release candidate in a working ComfyUI environment and approved publication.

## Fixes

- Move any connected `TEXT:n` input or `TEXT_LIST` with its existing source cable when clicking the per-row outlined up/down buttons.
- Support modern ComfyUI link stores which reject moving a link into an occupied target slot: use the existing unconnected spare input temporarily, without rebuilding links.
- Keep socket names, existing link IDs, reroutes and source nodes intact; refresh saved `input_order` for actual Python concatenation.
- Preserve delimiter behavior, backwards compatibility, MIT licensing and all other Batch Text features.

## Verified

- 23 Python unit tests passed.
- JavaScript simulated frontend tests passed, including modern link-store occupancy and cable attachment checks.
- Owner confirmed live ComfyUI cable-follow behavior and processing order on 27 October 2026.

## Update

Stop ComfyUI. Back up your workflow and old `Valhalla_BatchText` custom-node folder. Copy this folder over the old folder, restart ComfyUI, and hard-refresh with `Ctrl+Shift+R`. Node class and socket names remain unchanged.

Source: https://github.com/darkvalley/Valhalla/tree/main/ComfyUI/Valhalla_BatchText
