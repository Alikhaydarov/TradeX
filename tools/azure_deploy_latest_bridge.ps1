$ErrorActionPreference = 'Stop'

param(
  [string]$Revision = 'main'
)

$base = 'C:\mt5-api'
$repoBase = "https://raw.githubusercontent.com/Alikhaydarov/TradeX/$Revision/tools/mt5-vps"

New-Item -ItemType Directory -Force -Path $base | Out-Null

Invoke-WebRequest "$repoBase/main.py" -OutFile "$base\main.py"
Invoke-WebRequest "$repoBase/setup_service.ps1" -OutFile "$base\setup_service.ps1"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$base\setup_service.ps1"

Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -match 'C:\\mt5-api\\main\.py|start_server_debug\.bat|start_server_background\.bat'
} | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\mt5-api\watchdog.ps1
Start-Sleep -Seconds 5

Write-Host '=== deployed workers ==='
Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match 'python|cmd' -and $_.CommandLine -match 'mt5-api|start_server|watchdog'
} | ForEach-Object {
  Write-Host ($_.Name + ' | ' + $_.ProcessId + ' | ' + $_.CommandLine)
}
