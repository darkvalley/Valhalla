# Publish the Valhalla Batch Text Wiki

The actual GitHub Wiki uses a **separate Git repository**, `https://github.com/darkvalley/Valhalla.wiki.git`. This directory contains the English Markdown pages for v1.5.3. The SVG diagrams live under `docs/images/` in the main repository and are linked through raw GitHub URLs.

## Recommended: GitHub Actions

[The Publish Valhalla Batch Text Wiki workflow](https://github.com/darkvalley/Valhalla/actions/workflows/publish-batchtext-wiki.yml) runs when Wiki source Markdown pages change, and supports **Run workflow** from the Actions tab. It clones and synchronizes the seven Wiki pages with the existing Wiki without force-pushing.

For the first publication, the workflow also attempts a safe initial `master` push if the Wiki is not yet accessible. If GitHub rejects that push, open https://github.com/darkvalley/Valhalla/wiki, create/save an initial `Home` page (contents in [`Home.md`](Home.md)), then use **Actions → Publish Valhalla Batch Text Wiki → Run workflow**. GitHub does not always expose the Wiki Git remote until this first page exists.

## Alternative: local PowerShell

Run `Publish-Valhalla-Wiki.ps1` from an authenticated Git for Windows installation:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\TEMP\Valhalla\ComfyUI\Valhalla_BatchText\docs\wiki\Publish-Valhalla-Wiki.ps1'
```

This command clones or pulls the Wiki Git repository, copies only Wiki Markdown pages, commits the changes and pushes them. Run it from an updated local clone of `darkvalley/Valhalla`; adjust the path to your clone.

The ChatGPT GitHub integration writes the **main repository** and can trigger the checked-in GitHub Actions workflow. The actual Wiki is published separately; check the workflow result to verify success.
