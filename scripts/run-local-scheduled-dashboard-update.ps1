[CmdletBinding()]
param(
  [string]$LogPath = "tmp/scheduled-dashboard-update.log"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $repoRoot

function ConvertTo-RepoPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PathValue
  )

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }
  return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $PathValue))
}

$logFile = ConvertTo-RepoPath $LogPath
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $logFile) | Out-Null

function Write-LogLine {
  param([string]$Line)
  Write-Output $Line
  Add-Content -LiteralPath $logFile -Encoding UTF8 -Value $Line
}

Set-Content -LiteralPath $logFile -Encoding UTF8 -Value "[$((Get-Date).ToString('o'))] local scheduled dashboard update started"

try {
  $scriptPath = Join-Path $repoRoot "scripts/update-local-scheduled-dashboard.ps1"
  $output = & $scriptPath 2>&1
  foreach ($line in $output) {
    Write-LogLine ([string]$line)
  }
  Write-LogLine "[$((Get-Date).ToString('o'))] local scheduled dashboard update completed"
  exit 0
} catch {
  Write-LogLine "[$((Get-Date).ToString('o'))] local scheduled dashboard update failed"
  Write-LogLine ([string]$_)
  exit 1
}
