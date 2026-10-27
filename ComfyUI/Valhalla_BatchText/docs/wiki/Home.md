# Valhalla Batch Text — Wiki

**ComfyUI custom node • v1.4.0 • Conceived and created by Werner de Jong • MIT License**

Batch Text merges an optional native ComfyUI `STRING` list and any number of individual `STRING` connections into **one `STRING` output**. You control how the elements are separated using a delimiter dropdown or a custom string.

![Overview of Valhalla Batch Text](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/01-node-overview.svg)

## Start here

- [Batch Text — Overview](https://github.com/darkvalley/Valhalla/wiki/Batch-Text) — sockets, node behavior and join order
- [Using TEXT_LIST](https://github.com/darkvalley/Valhalla/wiki/Using-TEXT-LIST) — native lists vs. multiline text
- [Combining Inputs and Delimiters](https://github.com/darkvalley/Valhalla/wiki/Combining-Inputs-and-Delimiters) — examples, presets and custom separators
- [Installation and Troubleshooting](https://github.com/darkvalley/Valhalla/wiki/Installation-and-Troubleshooting) — Windows installation, upgrading and fixes

## Quick example

Connect `TEXT:0 = Mara` and `TEXT:1 = Greek dress`, then select `Comma (, )`. The output is `Mara, Greek dress`. With `Blank line (\n\n)` the two pieces of text are separated by an empty line.

**Source:** [Valhalla Batch Text folder](https://github.com/darkvalley/Valhalla/tree/main/ComfyUI/Valhalla_BatchText) · [MIT license](https://github.com/darkvalley/Valhalla/blob/main/ComfyUI/Valhalla_BatchText/LICENSE)

> **Image note:** Diagrams are explanatory illustrations, not live ComfyUI screenshots. Example source node names illustrate data types and are not required dependencies.
