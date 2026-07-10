$ErrorActionPreference = "Stop"

$baseDir = "C:\mt5-api"
$runner = Join-Path $baseDir "run-server.ps1"

if (!(Test-Path $runner)) {
  throw "$runner not found. Copy run-server.ps1 into C:\mt5-api first."
}

$taskName = "TradeWay MT5 Watchdog"
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runner`""

$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger @($startupTrigger, $logonTrigger) `
  -Settings $settings `
  -RunLevel Highest `
  -Force `
  -Description "TradeWay MT5 watchdog: keeps MT5 terminal and FastAPI auto-sync alive." | Out-Null

Start-ScheduledTask -TaskName $taskName

Write-Host "Scheduled task installed and started:"
Write-Host "  $taskName"
Write-Host "Check logs in C:\mt5-api\logs\watchdog.log"
