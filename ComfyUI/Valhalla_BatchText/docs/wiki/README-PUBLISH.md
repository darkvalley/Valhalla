# Publish Valhalla Batch Text to GitHub Wiki

GitHub Wikis are a separate Git repository. This folder contains ready-to-publish Markdown source; illustrations stay in the regular `darkvalley/Valhalla` repository and are referenced with immutable-looking raw main-branch URLs.

**Bootstrap the Wiki once (required):** Open https://github.com/darkvalley/Valhalla/wiki, create its first `Home` page (paste the contents of `Home.md`) and click **Save Page**. This initializes `Valhalla.wiki.git`.

**Publish remaining pages via Git:**

```powershell
git clone https://github.com/darkvalley/Valhalla.wiki.git C:\TEMP\Valhalla-Wiki
Copy-Item 'C:\TEMP\Valhalla\ComfyUI\Valhalla_BatchText\docs\wiki\*.md' 'C:\TEMP\Valhalla-Wiki\' -Force
git -C C:\TEMP\Valhalla-Wiki add .
git -C C:\TEMP\Valhalla-Wiki commit -m 'Add Batch Text v1.4.0 wiki guide'
git -C C:\TEMP\Valhalla-Wiki push
```

Run these commands with Git authentication on your own computer; customize local paths. Verify https://github.com/darkvalley/Valhalla/wiki afterwards. The connected ChatGPT GitHub integration does not provide GitHub Wiki write actions.

These diagrams are clear vector documentation illustrations, not literal screenshots of ComfyUI. A node producing a native STRING list is shown generically; do not assume a particular Valhalla source socket necessarily emits `OUTPUT_IS_LIST`.
