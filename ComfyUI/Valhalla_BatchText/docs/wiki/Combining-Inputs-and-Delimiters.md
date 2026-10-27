# Combining Inputs and Delimiters

![Combined text example](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/03-combining-inputs.svg)

## Mixed input example

Connect `TEXT:0 = A`, `TEXT_LIST = [L1, L2]`, and `TEXT:1 = B`. Use the arrows to put `TEXT_LIST` between the other two sockets and select `Pipe (|)`. The output is **`A|L1|L2|B`**. Change the order and the actual output changes.

Use `Blank line (\n\n)` when separating larger prompt sections. **This delimiter also separates list elements from one another.** If you need different separators within a list than between groups, first join the list separately.

![Delimiter presets](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/04-delimiter-presets.svg)

## Available options

| Setting | Separator |
| --- | --- |
| `None (direct)` | Empty string |
| `Space ( )` | One space |
| `Comma (, )` / `Comma (,)` | Comma with / without trailing space |
| `Semicolon` / `Colon` / `Pipe` | The visible symbols, with or without spaces |
| `Tab (\t)` | Tab character |
| `LF (\n)` | Line feed |
| `CR (\r)` | Carriage return |
| `CRLF (\r\n)` | Windows line ending |
| `Blank line (\n\n)` | Two line feeds |
| `Custom` | Any literal text or supported escape sequence |

**Custom:** entering `\n`, `\r`, `\t`, or `\\` produces line feed, carriage return, tab, or backslash. Other literal characters (including emoji) are also supported.

## Order matters

See [Reordering Inputs](https://github.com/darkvalley/Valhalla/wiki/Reordering-Inputs). The arrows move the connected sockets and keep their cables, and the saved top-to-bottom order is passed to Python.
