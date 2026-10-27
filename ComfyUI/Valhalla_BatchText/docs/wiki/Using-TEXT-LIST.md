# Using TEXT_LIST

A *native ComfyUI list* is not the same as one `STRING` containing newline characters. `TEXT_LIST` is designed for node outputs that produce a list of `STRING` values (for example, via `OUTPUT_IS_LIST = (True,)`). Batch Text receives and joins those values.

![Using TEXT_LIST](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/02-using-text-list.svg)

## Example

If a compatible node outputs `['face.png', 'body.png', 'wardrobe.png']`, connect its `STRING` output to `TEXT_LIST` and select `LF (\n)`. Batch Text returns one string with the three paths on separate lines.

```text
face.png
body.png
wardrobe.png
```

**Do not assume** a source node output is a native list merely because its preview contains several lines. A multiline `STRING` is still one element. Consult the source node definition or test it.

## Compatibility

- `TEXT_LIST` accepts ComfyUI `STRING` connections. It is **not** a universal converter for arbitrary Python objects, JSON arrays or image batches.
- For JSON containing a list of strings, use a separate parsing/conversion step first.
- Use the numbered `TEXT:n` inputs for ordinary independent pieces of text.
- Batch Text does not remove duplicates or filter missing paths.

[Next: Combining Inputs and Delimiters](https://github.com/darkvalley/Valhalla/wiki/Combining-Inputs-and-Delimiters)
