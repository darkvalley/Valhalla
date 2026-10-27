# Using TEXT_LIST

`TEXT_LIST` is a special **native ComfyUI list input** for `STRING` data. It is not a general Python object or image list socket, and a multiline `STRING` remains one string.

![Native list example](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/02-using-text-list.svg)

A source producing a native list `['face.png', 'body.png', 'wardrobe.png']`, together with delimiter `LF (\n)`, produces:

```text
face.png
body.png
wardrobe.png
```

You may also connect individual strings to `TEXT:n` sockets. **In v1.5.1, place TEXT_LIST anywhere in the input order using the arrows.** The list items are joined at that position, rather than always before the other connected text inputs.

To check whether an upstream node really emits a native list, consult its definition or verify its output. `TEXT_LIST` expects native ComfyUI `STRING` values, not arbitrary custom objects. The node does not remove duplicates.

[See input ordering examples](https://github.com/darkvalley/Valhalla/wiki/Reordering-Inputs).
