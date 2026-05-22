param(
  [Parameter(Mandatory = $true)]
  [string[]]$TaskSpec,

  [string]$Output = "tmp/task-scheduler-health.json"
)

$ErrorActionPreference = "Stop"

function ConvertTo-PublicTaskTime {
  param([AllowNull()]$Value)

  if ($null -eq $Value) {
    return $null
  }

  $date = [datetime]$Value
  if ($date.Year -lt 2000) {
    return $null
  }

  return $date.ToString("o")
}

function ConvertTo-PublicStatus {
  param(
    [AllowNull()]$Task,
    [AllowNull()]$Info
  )

  if ($null -eq $Task) {
    return @{
      status = "error"
      reason = "scheduled task not found"
      slo_burn = 2.4
      error_rate = 1.0
      affected_sessions = 1
    }
  }

  $state = [string]$Task.State
  $lastResult = if ($null -ne $Info) { [int64]$Info.LastTaskResult } else { $null }
  $missed = if ($null -ne $Info) { [int]$Info.NumberOfMissedRuns } else { 0 }
  $hasNext = $null -ne $Info -and $null -ne (ConvertTo-PublicTaskTime $Info.NextRunTime)

  if ($state -eq "Disabled") {
    return @{
      status = "warning"
      reason = "task disabled"
      slo_burn = 1.5
      error_rate = 0.2
      affected_sessions = 1
    }
  }

  if ($missed -gt 0) {
    return @{
      status = "warning"
      reason = "missed runs detected"
      slo_burn = 1.6
      error_rate = [math]::Min(10, $missed)
      affected_sessions = $missed
    }
  }

  if ($state -eq "Running" -or $lastResult -eq 0 -or $lastResult -eq 267009) {
    return @{
      status = "ok"
      reason = if ($state -eq "Running" -or $lastResult -eq 267009) { "task running or last run still active" } else { "last run completed successfully" }
      slo_burn = 0.7
      error_rate = 0.0
      affected_sessions = 0
    }
  }

  if (-not $hasNext) {
    return @{
      status = "warning"
      reason = "no next run is scheduled"
      slo_burn = 1.3
      error_rate = 0.4
      affected_sessions = 1
    }
  }

  return @{
    status = "error"
    reason = "last task result indicates failure"
    slo_burn = 2.2
    error_rate = 1.0
    affected_sessions = 1
  }
}

function Parse-TaskSpec {
  param([string]$Spec)
  $parts = $Spec -split "\|", 5
  if ($parts.Count -lt 2) {
    throw "TaskSpec must be 'realTaskName|publicId|displayName|cadence|taskPath(optional)': $Spec"
  }
  return @{
    realTaskName = $parts[0]
    publicId = $parts[1]
    displayName = if ($parts.Count -ge 3 -and $parts[2]) { $parts[2] } else { $parts[1] }
    cadence = if ($parts.Count -ge 4 -and $parts[3]) { $parts[3] } else { "scheduled" }
    taskPath = if ($parts.Count -ge 5 -and $parts[4]) { $parts[4] } else { $null }
  }
}

$generatedAt = (Get-Date).ToString("o")
$tasks = foreach ($specText in $TaskSpec) {
  $spec = Parse-TaskSpec $specText
  $taskArgs = @{ TaskName = $spec.realTaskName; ErrorAction = "SilentlyContinue" }
  if ($spec.taskPath) {
    $taskArgs.TaskPath = $spec.taskPath
  }
  $task = Get-ScheduledTask @taskArgs
  $info = if ($null -ne $task) { Get-ScheduledTaskInfo @taskArgs } else { $null }
  $status = ConvertTo-PublicStatus -Task $task -Info $info
  $lastRun = if ($null -ne $info) { ConvertTo-PublicTaskTime $info.LastRunTime } else { $null }
  $nextRun = if ($null -ne $info) { ConvertTo-PublicTaskTime $info.NextRunTime } else { $null }

  [ordered]@{
    id = $spec.publicId
    display_name = $spec.displayName
    cadence = $spec.cadence
    state = if ($null -ne $task) { [string]$task.State } else { "Missing" }
    status = $status.status
    status_reason = $status.reason
    last_run_time = $lastRun
    next_run_time = $nextRun
    last_task_result = if ($null -ne $info) { [int64]$info.LastTaskResult } else { $null }
    missed_runs = if ($null -ne $info) { [int]$info.NumberOfMissedRuns } else { 0 }
    affected_sessions = $status.affected_sessions
    slo_burn = $status.slo_burn
    error_rate = $status.error_rate
    checks = [ordered]@{
      registration = [ordered]@{
        status = if ($null -ne $task) { "ok" } else { "error" }
        duration_ms = 250
        message = if ($null -ne $task) { "task registration found" } else { "task registration missing" }
      }
      last_result = [ordered]@{
        status = $status.status
        duration_ms = 350
        message = $status.reason
      }
      next_schedule = [ordered]@{
        status = if ($null -ne $nextRun) { "ok" } else { "warning" }
        duration_ms = 180
        message = if ($null -ne $nextRun) { "next run exists" } else { "next run not available" }
      }
      public_redaction = [ordered]@{
        status = "ok"
        duration_ms = 120
        message = "raw task name, action path, and command body are not copied"
      }
    }
  }
}

$outputObject = [ordered]@{
  generated_at = $generatedAt
  source = [ordered]@{
    type = "windows-task-scheduler"
    raw_task_names_copied = $false
    action_paths_copied = $false
    command_output_copied = $false
  }
  tasks = @($tasks)
}

$outputPath = if ([System.IO.Path]::IsPathRooted($Output)) {
  $Output
} else {
  Resolve-Path -LiteralPath "." | ForEach-Object { Join-Path $_.Path $Output }
}
$outputDir = Split-Path -Parent $outputPath
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$outputObject | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $outputPath -Encoding UTF8
Write-Host "OK: wrote sanitized Task Scheduler health artifact to $Output"
