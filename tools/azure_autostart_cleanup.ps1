$ErrorActionPreference = 'Continue'

Write-Host '=== removing legacy tasks ==='
$legacyTasks = @(
  'TradeWay MT5 Auto Sync',
  'TradeWay MT5 User Sync',
  'TradeX MT5 FastAPI'
)

foreach ($task in $legacyTasks) {
  schtasks /Delete /TN $task /F | Out-Null
  Write-Host ('removed task ' + $task)
}

Write-Host '=== stopping legacy starter processes ==='
Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -match 'start_server_debug\.bat|start_server_background\.bat'
} | ForEach-Object {
  try {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
    Write-Host ('stopped starter pid=' + $_.ProcessId)
  } catch {
    Write-Host ('failed stopping starter pid=' + $_.ProcessId + ' ' + $_.Exception.Message)
  }
}

Write-Host '=== stopping duplicate python workers ==='
$workers = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'python.exe' -and $_.CommandLine -match 'C:\\mt5-api\\main\.py'
} | Sort-Object ProcessId

if ($workers.Count -gt 1) {
  $keepers = $workers | Where-Object { $_.CommandLine -match '\\.venv\\Scripts\\python\.exe' }
  if (-not $keepers) {
    $keepers = @($workers | Select-Object -First 1)
  }
  $keeperIds = $keepers | Select-Object -ExpandProperty ProcessId
  foreach ($worker in $workers) {
    if ($keeperIds -notcontains $worker.ProcessId) {
      try {
        Stop-Process -Id $worker.ProcessId -Force -ErrorAction Stop
        Write-Host ('stopped duplicate python pid=' + $worker.ProcessId)
      } catch {
        Write-Host ('failed stopping python pid=' + $worker.ProcessId + ' ' + $_.Exception.Message)
      }
    } else {
      Write-Host ('keeping python pid=' + $worker.ProcessId)
    }
  }
}

Write-Host '=== running watchdog once ==='
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\mt5-api\watchdog.ps1

Write-Host '=== remaining relevant tasks ==='
Get-ScheduledTask | Where-Object {
  $_.TaskName -like '*TradeWay*' -or $_.TaskName -like '*MT5*'
} | ForEach-Object {
  Write-Host ('TASK ' + $_.TaskName)
  $_.Actions | ForEach-Object { Write-Host ('  ACTION ' + $_.Execute + ' ' + $_.Arguments) }
}

Write-Host '=== remaining worker processes ==='
Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match 'python|cmd' -and $_.CommandLine -match 'mt5-api|start_server|watchdog'
} | ForEach-Object {
  Write-Host ($_.Name + ' | ' + $_.ProcessId + ' | ' + $_.CommandLine)
}
