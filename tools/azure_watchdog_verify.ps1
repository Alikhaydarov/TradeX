Write-Host '=== task boot ==='
schtasks /Query /TN "TradeWay MT5 StartAtBoot" /V /FO LIST
Write-Host '=== task watchdog ==='
schtasks /Query /TN "TradeWay MT5 Watchdog" /V /FO LIST
Write-Host '=== watchdog log ==='
if (Test-Path 'C:\mt5-api\logs\watchdog.log') {
  Get-Content 'C:\mt5-api\logs\watchdog.log' -Tail 20
} else {
  Write-Host 'missing watchdog log'
}
Write-Host '=== server log tail ==='
if (Test-Path 'C:\mt5-api\logs\server.log') {
  Get-Content 'C:\mt5-api\logs\server.log' -Tail 60
} else {
  Write-Host 'missing server log'
}
Write-Host '=== processes ==='
Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'python|terminal64|cmd' } | ForEach-Object {
  Write-Host ($_.Name + ' | ' + $_.ProcessId + ' | ' + $_.CommandLine)
}
