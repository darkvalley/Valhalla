[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$ComfyUIRoot)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($ComfyUIRoot)
$customNodes = Join-Path $root 'custom_nodes'
$source = $PSScriptRoot
$target = Join-Path $customNodes 'Valhalla_BatchText'
if (-not (Test-Path -LiteralPath $customNodes -PathType Container)) {
  throw "custom_nodes directory not found: $customNodes. Supply the active ComfyUI root."
}
if (-not (Test-Path -LiteralPath (Join-Path $source '__init__.py') -PathType Leaf)) {
  throw "Node source not found: $source"
}
if ([System.IO.Path]::GetFullPath($source).TrimEnd('\\') -eq [System.IO.Path]::GetFullPath($target).TrimEnd('\\')) {
  throw 'Source and destination are identical. The node is already in custom_nodes.'
}
if (Test-Path -LiteralPath $target) {
  $backupDir = Join-Path $root 'Valhalla_CustomNode_Backups'
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backup = Join-Path $backupDir "Valhalla_BatchText_$stamp"
  Copy-Item -LiteralPath $target -Destination $backup -Recurse -Force
  Write-Host "Existing node backed up to: $backup" -ForegroundColor Yellow
  Remove-Item -LiteralPath $target -Recurse -Force
}
Copy-Item -LiteralPath $source -Destination $target -Recurse
Write-Host "Installed: $target" -ForegroundColor Green
Write-Host 'Restart ComfyUI and hard-refresh the browser with Ctrl+Shift+R.'
