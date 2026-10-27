# Publish the Valhalla Batch Text Wiki

The actual GitHub Wiki uses a **separate Git repository**, `https://github.com/darkvalley/Valhalla.wiki.git`. This directory contains the English Markdown pages for v1.5.3. The SVG diagrams live under `docs/images/` in the main repository and are linked through raw GitHub URLs.

First create/save the initial `Home` page at https://github.com/darkvalley/Valhalla/wiki if the Wiki has not yet been initialized. Then use the local `Publish-Valhalla-Wiki.ps1` script, with an authenticated Git for Windows installation:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\TEMP\Valhalla\ComfyUI\Valhalla_BatchText\docs\wiki\Publish-Valhalla-Wiki.ps1'
```

This command clones or pulls the Wiki Git repository, copies only Wiki Markdown pages, commits the changes and pushes them. Run it from an updated local clone of `darkvalley/Valhalla`; adjust the path to your clone.

The ChatGPT GitHub integration can update the **main repository** but cannot currently push to the separate Wiki Git remote.
