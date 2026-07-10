$ErrorActionPreference = 'Continue'

Write-Host '=== stop all mt5-api workers ==='
Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -match 'C:\\mt5-api\\main\.py|start_server_debug\.bat|start_server_background\.bat|watchdog\.ps1'
} | Sort-Object ProcessId -Descending | ForEach-Object {
  try {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
    Write-Host ('stopped pid=' + $_.ProcessId + ' ' + $_.Name)
  } catch {
    Write-Host ('failed pid=' + $_.ProcessId + ' ' + $_.Exception.Message)
  }
}

Start-Sleep -Seconds 3

Write-Host '=== start clean watchdog ==='
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\mt5-api\watchdog.ps1
Start-Sleep -Seconds 5

Write-Host '=== active workers after reset ==='
Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match 'python|cmd' -and $_.CommandLine -match 'mt5-api|start_server|watchdog'
} | ForEach-Object {
  Write-Host ($_.Name + ' | ' + $_.ProcessId + ' | ' + $_.CommandLine)
}
