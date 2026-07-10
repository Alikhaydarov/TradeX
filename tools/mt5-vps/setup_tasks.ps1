$ErrorActionPreference = "Stop"

$runner = "C:\mt5-api\run-server.ps1"
$ngrokBat = "C:\mt5-api\start-ngrok.bat"

if (!(Test-Path $runner)) { throw "$runner not found." }
if (!(Test-Path $ngrokBat)) { throw "$ngrokBat not found." }

$apiAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runner`""
$ngrokAction = New-ScheduledTaskAction -Execute $ngrokBat -WorkingDirectory "C:\mt5-api"
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName "TradeWay MT5 API" -Action $apiAction -Trigger @($startupTrigger, $logonTrigger) -Settings $settings -RunLevel Highest -Force
Register-ScheduledTask -TaskName "TradeWay ngrok Tunnel" -Action $ngrokAction -Trigger @($startupTrigger, $logonTrigger) -Settings $settings -RunLevel Highest -Force

Write-Host "Scheduled tasks created:"
Write-Host "  TradeWay MT5 API (watchdog)"
Write-Host "  TradeWay ngrok Tunnel"
