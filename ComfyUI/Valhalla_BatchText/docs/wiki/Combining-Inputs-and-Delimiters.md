# Combining Inputs and Delimiters

![Combining list and manual inputs](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/03-combining-inputs.svg)

## Example: Reference paths plus instructions

Provide a native list through `TEXT_LIST`:

```text
face.png
body.png
```

Provide additional instructions through `TEXT:0`:

```text
REFERENCE IMAGE RULES
Preserve facial identity.
Preserve body proportions.
```

Choose **Blank line (`\n\n`)** to produce one output containing the listed paths followed by a blank line and the instructions. List items always come first, followed by `TEXT:0`, `TEXT:1`, etc.

![Delimiter options](https://raw.githubusercontent.com/darkvalley/Valhalla/main/ComfyUI/Valhalla_BatchText/docs/images/04-delimiter-presets.svg)

## Common delimiter presets

| Preset | Actual separator |
| --- | --- |
| None (direct) | empty string |
| Space | ` ` |
| Comma | `, ` or `,` |
| Semicolon | `; ` or `;` |
| Pipe | ` \| ` or `\|` |
| Tab | `\t` |
| LF | `\n` |
| CR | `\r` |
| CRLF | `\r\n` |
| Blank line | `\n\n` |
| Custom | Any supplied text |

### Custom delimiters

Selecting **Custom** reveals `custom_delimiter`. Enter arbitrary text, emoji, actual line breaks or supported escapes: `\n`, `\r`, `\t` and `\\`. Empty Custom joins directly. The actual Python separator is used (e.g. `CRLF` is the two control characters `\r\n`, not printed backslash characters).

**Tip:** `Blank line` is often helpful for separating prompts, reference instructions and other blocks. It also inserts that delimiter *between list elements*, not only between major groups. If you need different separators within and between groups, join each group separately and then join those results.
