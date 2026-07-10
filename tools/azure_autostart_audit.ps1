Write-Host '=== mt5 scheduled tasks ==='
Get-ScheduledTask | Where-Object {
  $_.TaskName -like '*TradeWay*' -or $_.TaskName -like '*MT5*' -or
  ($_.Actions.Execute -match 'mt5-api|start_server|watchdog' -or $_.Actions.Arguments -match 'mt5-api|start_server|watchdog')
} | ForEach-Object {
  Write-Host ('TASK ' + $_.TaskName)
  $_.Actions | ForEach-Object { Write-Host ('  ACTION ' + $_.Execute + ' ' + $_.Arguments) }
}

Write-Host '=== startup folder ==='
$startupPaths = @(
  'C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp',
  'C:\Users\AzureUser\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup'
)
foreach ($path in $startupPaths) {
  Write-Host ('PATH ' + $path)
  if (Test-Path $path) {
    Get-ChildItem $path | ForEach-Object { Write-Host ('  ' + $_.FullName) }
  }
}

Write-Host '=== run registry ==='
$runKeys = @(
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run',
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
)
foreach ($key in $runKeys) {
  Write-Host ('KEY ' + $key)
  if (Test-Path $key) {
    Get-ItemProperty $key | Format-List | Out-String | Write-Host
  }
}

Write-Host '=== matching processes ==='
Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'python|cmd' -and $_.CommandLine -match 'mt5-api|start_server|watchdog' } | ForEach-Object {
  Write-Host ($_.Name + ' | ' + $_.ProcessId + ' | ' + $_.CommandLine)
}
