$ErrorActionPreference = "Stop"

$watchdog = "C:\mt5-api\watchdog.ps1"

if (!(Test-Path $watchdog)) {
  throw "$watchdog not found. Copy watchdog.ps1 into C:\mt5-api first."
}

$legacyTasks = @(
  "TradeWay MT5 Auto Sync",
  "TradeWay MT5 User Sync",
  "TradeX MT5 FastAPI",
  "TradeWay MT5 API"
)

foreach ($task in $legacyTasks) {
  schtasks /Delete /TN $task /F | Out-Null
}

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`""
schtasks /Create /TN "TradeWay MT5 StartAtBoot" /SC ONSTART /RL HIGHEST /RU SYSTEM /TR $taskCommand /F | Out-Null
schtasks /Create /TN "TradeWay MT5 Watchdog" /SC MINUTE /MO 5 /RL HIGHEST /RU SYSTEM /TR $taskCommand /F | Out-Null
schtasks /Run /TN "TradeWay MT5 StartAtBoot" | Out-Null

Write-Host "Scheduled tasks installed:"
Write-Host "  TradeWay MT5 StartAtBoot"
Write-Host "  TradeWay MT5 Watchdog"
Write-Host "Check logs in C:\mt5-api\logs\watchdog.log"
