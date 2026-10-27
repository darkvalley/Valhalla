<# 
.SYNOPSIS
Publishes Valhalla Batch Text documentation into the GitHub Wiki.
.DESCRIPTION
Requires a Wiki initialized with its first Home page, Git for Windows,
and working GitHub authentication. Does not modify ComfyUI node files.
#>
[CmdletBinding()]
param(
    [string]$Repository = 'darkvalley/Valhalla',
    [string]$WorkDirectory = (Join-Path $env:TEMP 'Valhalla-BatchText-Wiki')
)
$ErrorActionPreference = 'Stop'

$source = $PSScriptRoot
$pages = @(
    'Home.md',
    'Batch-Text.md',
    'Using-TEXT-LIST.md',
    'Combining-Inputs-and-Delimiters.md',
    'Installation-and-Troubleshooting.md',
    '_Sidebar.md'
)
foreach ($page in $pages) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $page) -PathType Leaf)) {
        throw "Cannot find $page in $source. Clone or download the full Valhalla repository."
    }
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed. Install Git for Windows and sign in to GitHub.'
}

$remote = "https://github.com/$Repository.wiki.git"
Write-Host "Wiki: $remote" -ForegroundColor Cyan

if (Test-Path -LiteralPath (Join-Path $WorkDirectory '.git')) {
    & git -C $WorkDirectory pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'Wiki pull failed. Check the existing local Git repository.' }
} else {
    if (Test-Path -LiteralPath $WorkDirectory) {
        throw "Directory already exists without Git: $WorkDirectory. Specify another -WorkDirectory."
    }
    & git clone $remote $WorkDirectory
    if ($LASTEXITCODE -ne 0) {
        throw "Wiki clone failed. First open https://github.com/$Repository/wiki, create the first Home page and save it."
    }
}

foreach ($page in $pages) {
    Copy-Item -LiteralPath (Join-Path $source $page) -Destination (Join-Path $WorkDirectory $page) -Force
}
& git -C $WorkDirectory add -- $pages
if ($LASTEXITCODE -ne 0) { throw 'Git add failed.' }

& git -C $WorkDirectory diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host 'Wiki already up to date.' -ForegroundColor Green
    exit 0
}
if ($LASTEXITCODE -ne 1) { throw 'Git diff failed.' }

& git -C $WorkDirectory commit -m 'Publish illustrated Valhalla Batch Text documentation'
if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Check Git user.name and user.email.' }
& git -C $WorkDirectory push
if ($LASTEXITCODE -ne 0) { throw 'Wiki push failed. Check your GitHub permissions and authentication.' }
Write-Host "Published: https://github.com/$Repository/wiki" -ForegroundColor Green
