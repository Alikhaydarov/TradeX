$ErrorActionPreference = 'Continue'

Write-Host '=== mt5-api python workers with parents ==='
$workers = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'python.exe' -and $_.CommandLine -match 'C:\\mt5-api\\main\.py'
}

foreach ($worker in $workers) {
  Write-Host ('WORKER ' + $worker.ProcessId + ' | parent=' + $worker.ParentProcessId + ' | ' + $worker.CommandLine)
  $parent = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $worker.ParentProcessId) -ErrorAction SilentlyContinue
  if ($parent) {
    Write-Host ('  PARENT ' + $parent.ProcessId + ' | ' + $parent.Name + ' | ' + $parent.CommandLine)
  }
}

Write-Host '=== services matching python or mt5-api ==='
Get-CimInstance Win32_Service | Where-Object {
  $_.PathName -match 'python|mt5-api|main\.py|start_server'
} | ForEach-Object {
  Write-Host ('SERVICE ' + $_.Name + ' | state=' + $_.State + ' | start=' + $_.StartMode + ' | ' + $_.PathName)
}

Write-Host '=== all scheduled tasks actions containing python/cmd/bat ==='
Get-ScheduledTask | ForEach-Object {
  $task = $_
  foreach ($action in $task.Actions) {
    $text = ($action.Execute + ' ' + $action.Arguments)
    if ($text -match 'python|mt5-api|main\.py|start_server|watchdog') {
      Write-Host ('TASK ' + $task.TaskName + ' | ' + $text)
    }
  }
}
