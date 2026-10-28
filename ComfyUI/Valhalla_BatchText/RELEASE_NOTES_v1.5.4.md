# Valhalla Batch Text v1.5.4 — Saved Input Order Fix

**Released:** 28 October 2026  
**Author:** Werner de Jong  
**License:** MIT

The v1.5.4 candidate was tested successfully in a local ComfyUI workflow and approved for stable publication on 28 October 2026.

## Fixed

- Resolves [issue #1](https://github.com/darkvalley/Valhalla/issues/1): the selected input-port order no longer resets after restarting ComfyUI or reopening a saved workflow.
- Restores the saved order of `TEXT_LIST` and dynamically connected `TEXT:n` ports, preserving the corresponding cables, link identities and source nodes.
- Persists the visual order in workflow metadata alongside the existing hidden `input_order` value used by the Python backend.
- Preserves dynamic text inputs, delimiters, custom separators, native list support, existing workflows, and the original `ValhallaBatchText` node class.

## Validation

- Confirmed working in the owner's local ComfyUI environment on 28 October 2026.
- Seven Python backend tests and the frontend persistence regression passed in the release candidate.
- The stable implementation matches the approved v1.5.4 RC functionality; only user-facing RC version labels have been removed.

## Install / update

Download `Valhalla_BatchText_v1.5.4.zip`, stop ComfyUI and replace the existing `Valhalla_BatchText` folder inside `custom_nodes`. Restart ComfyUI and hard-refresh the browser. Save your existing workflow once using v1.5.4 to store the new order metadata.

**Source:** https://github.com/darkvalley/Valhalla/tree/main/ComfyUI/Valhalla_BatchText
