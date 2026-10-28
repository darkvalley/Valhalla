<# Publishes Valhalla Batch Text pages to the separate GitHub Wiki repo. #>
[CmdletBinding()]
param(
  [string]$Repository = 'darkvalley/Valhalla',
  [string]$WorkDirectory = (Join-Path $env:TEMP 'Valhalla-BatchText-Wiki')
)
$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$pages = @('Home.md','Batch-Text.md','Reordering-Inputs.md','Using-TEXT-LIST.md','Combining-Inputs-and-Delimiters.md','Installation-and-Troubleshooting.md','_Sidebar.md')
foreach($page in $pages) {
  if(-not (Test-Path -LiteralPath (Join-Path $source $page))) { throw "Missing Wiki page: $page" }
}
if(-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git for Windows is required.' }
$remote = "https://github.com/$Repository.wiki.git"
if(Test-Path -LiteralPath (Join-Path $WorkDirectory '.git')) {
  & git -C $WorkDirectory pull --ff-only
  if($LASTEXITCODE -ne 0) { throw 'Unable to update the local Wiki checkout.' }
} else {
  if(Test-Path -LiteralPath $WorkDirectory) { throw "Directory exists but is not a git repository: $WorkDirectory" }
  & git clone $remote $WorkDirectory
  if($LASTEXITCODE -ne 0) { throw "Unable to clone $remote. Initialize the Wiki by saving its first Home page in the GitHub UI." }
}
foreach($page in $pages) { Copy-Item -LiteralPath (Join-Path $source $page) -Destination (Join-Path $WorkDirectory $page) -Force }
& git -C $WorkDirectory add -- $pages
if($LASTEXITCODE -ne 0) { throw 'git add failed' }
& git -C $WorkDirectory diff --cached --quiet
if($LASTEXITCODE -eq 0) { Write-Host 'Wiki is up to date.'; exit 0 }
if($LASTEXITCODE -ne 1) { throw 'git diff failed' }
& git -C $WorkDirectory commit -m 'Update Batch Text v1.5.4 Wiki with persistent input ordering'
if($LASTEXITCODE -ne 0) { throw 'git commit failed; check user name and email.' }
& git -C $WorkDirectory push
if($LASTEXITCODE -ne 0) { throw 'git push failed; check GitHub login/permissions.' }
Write-Host "Published https://github.com/$Repository/wiki" -ForegroundColor Green
