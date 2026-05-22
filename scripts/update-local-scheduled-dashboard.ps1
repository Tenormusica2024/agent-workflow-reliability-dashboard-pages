[CmdletBinding()]
param(
  [string]$TaskSpecFile = "config/local-task-scheduler-tasks.json",
  [string[]]$TaskSpec = @(),
  [string]$SchedulerHealthOutput = "tmp/task-scheduler-health.json",
  [string]$ScheduledConfig = "config/local-scheduled-sources.json",
  [string[]]$Profile = @(),
  [switch]$SkipCollect,
  [switch]$SkipImport,
  [switch]$SkipValidate
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $repoRoot

function ConvertTo-RepoPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PathValue,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $candidate = if ([System.IO.Path]::IsPathRooted($PathValue)) {
    [System.IO.Path]::GetFullPath($PathValue)
  } else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $PathValue))
  }
  $root = [System.IO.Path]::GetFullPath($repoRoot)
  if (-not $candidate.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "$Label must stay inside repository root: $PathValue"
  }
  return $candidate
}

function ConvertFrom-TaskSpecFile {
  param([string]$PathValue)

  $filePath = ConvertTo-RepoPath $PathValue "TaskSpecFile"
  if (-not (Test-Path -LiteralPath $filePath)) {
    return @()
  }

  $raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
  $json = $raw | ConvertFrom-Json
  $items = if ($json -is [array]) { $json } else { @($json.tasks) }
  $rows = foreach ($item in $items) {
    if ($null -eq $item) { continue }
    $realTaskName = [string]$item.taskName
    if (-not $realTaskName) {
      $realTaskName = [string]$item.realTaskName
    }
    $publicId = [string]$item.publicId
    if (-not $realTaskName -or -not $publicId) {
      throw "TaskSpecFile entries require taskName and publicId"
    }
    $displayName = if ($item.displayName) { [string]$item.displayName } else { $publicId }
    $cadence = if ($item.cadence) { [string]$item.cadence } else { "scheduled" }
    "$realTaskName|$publicId|$displayName|$cadence"
  }
  return @($rows)
}

function Read-ProfileIds {
  param([string]$PathValue)

  $filePath = ConvertTo-RepoPath $PathValue "ScheduledConfig"
  if (-not (Test-Path -LiteralPath $filePath)) {
    throw "ScheduledConfig not found: $PathValue"
  }
  $configText = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
  $config = $configText | ConvertFrom-Json
  $ids = @($config.profiles | ForEach-Object { [string]$_.id } | Where-Object { $_ })
  if ($ids.Count -eq 0) {
    throw "ScheduledConfig has no profiles: $PathValue"
  }
  return $ids
}

function Invoke-Logged {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$Arguments = @()
  )

  Write-Host ">> $FilePath $($Arguments -join ' ')"
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath"
  }
}

$taskSpecs = @($TaskSpec)
if (-not $SkipCollect -and $taskSpecs.Count -eq 0) {
  $taskSpecs = ConvertFrom-TaskSpecFile $TaskSpecFile
}

if (-not $SkipCollect) {
  if ($taskSpecs.Count -gt 0) {
    $collectorOutput = ConvertTo-RepoPath $SchedulerHealthOutput "SchedulerHealthOutput"
    & (Join-Path $PSScriptRoot "collect-task-scheduler-health.ps1") -Output $collectorOutput -TaskSpec $taskSpecs
    if (-not $?) {
      throw "Task Scheduler collector failed"
    }
  } else {
    Write-Host "SKIP: no TaskSpec or TaskSpecFile found; collector step skipped"
  }
}

$profiles = if ($Profile.Count -gt 0) { @($Profile) } else { Read-ProfileIds $ScheduledConfig }

if (-not $SkipImport) {
  foreach ($profileId in $profiles) {
    Invoke-Logged "node" @("scripts/import-scheduled-run.mjs", "--config", $ScheduledConfig, "--profile", $profileId)
  }
}

if ($SkipValidate) {
  Invoke-Logged "npm.cmd" @("run", "build:scheduled")
} else {
  Invoke-Logged "npm.cmd" @("run", "check:scheduled")
}

$previewProfile = if ($profiles.Count -gt 0) { $profiles[0] } else { "<profile-id>" }
Write-Host ""
Write-Host "OK: local scheduled dashboard update completed"
Write-Host "Profiles: $($profiles -join ', ')"
Write-Host "Dashboard JSON: tmp/scheduled-dashboard-runs.json"
Write-Host "Preview: http://localhost:4173/runtime-flow/?data=../tmp/scheduled-dashboard-runs.json&profile=$previewProfile"
