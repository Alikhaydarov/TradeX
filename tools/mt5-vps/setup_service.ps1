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

$bootAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`""

$watchdogAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`""

$bootTrigger = New-ScheduledTaskTrigger -AtStartup
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date
$repeatTrigger.Repetition = New-ScheduledTaskRepetitionSettingsSet -Interval (New-TimeSpan -Minutes 5) -Duration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName "TradeWay MT5 StartAtBoot" `
  -Action $bootAction `
  -Trigger $bootTrigger `
  -Settings $settings `
  -RunLevel Highest `
  -Force `
  -Description "TradeWay MT5 starts the watchdog automatically when Windows boots." | Out-Null

Register-ScheduledTask `
  -TaskName "TradeWay MT5 Watchdog" `
  -Action $watchdogAction `
  -Trigger $repeatTrigger `
  -Settings $settings `
  -RunLevel Highest `
  -Force `
  -Description "TradeWay MT5 checks every 5 minutes and revives the bridge if needed." | Out-Null

Start-ScheduledTask -TaskName "TradeWay MT5 StartAtBoot"

Write-Host "Scheduled tasks installed:"
Write-Host "  TradeWay MT5 StartAtBoot"
Write-Host "  TradeWay MT5 Watchdog"
Write-Host "Check logs in C:\mt5-api\logs\watchdog.log"
