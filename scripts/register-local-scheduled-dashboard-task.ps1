[CmdletBinding()]
param(
  [string]$TaskName = "AgentWorkflowDashboardLocalUpdate",
  [string]$TaskPath = "\Tenormusica\",
  [int]$IntervalMinutes = 15,
  [switch]$Force,
  [switch]$RunNow,
  [switch]$Unregister
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

if ($IntervalMinutes -lt 5) {
  throw "IntervalMinutes must be 5 or greater to avoid excessive local load"
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$runner = Join-Path $repoRoot "scripts/run-local-scheduled-dashboard-update.ps1"
if (-not (Test-Path -LiteralPath $runner)) {
  throw "runner script not found: $runner"
}

$existing = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
if ($Unregister) {
  if ($null -ne $existing) {
    Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
    Write-Host "OK: unregistered Task Scheduler task $TaskPath$TaskName"
  } else {
    Write-Host "SKIP: Task Scheduler task not found: $TaskPath$TaskName"
  }
  exit 0
}

if ($null -ne $existing -and -not $Force) {
  throw "Task already exists: $TaskPath$TaskName. Re-run with -Force to replace it."
}

if ($null -ne $existing -and $Force) {
  Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
}

$startAt = (Get-Date).AddMinutes(1)
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At $startAt `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

$task = New-ScheduledTask `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Updates the local private scheduled dashboard JSON for Agent Runtime Flow. Public-safe artifacts only."

Register-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -InputObject $task | Out-Null
Write-Host "OK: registered Task Scheduler task $TaskPath$TaskName"
Write-Host "Interval: every $IntervalMinutes minutes"
Write-Host "Runner: $runner"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath
  Write-Host "OK: started Task Scheduler task once for verification"
}

Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath |
  Select-Object TaskName, TaskPath, State |
  Format-List
Get-ScheduledTaskInfo -TaskName $TaskName -TaskPath $TaskPath |
  Select-Object LastRunTime, LastTaskResult, NextRunTime, NumberOfMissedRuns |
  Format-List
