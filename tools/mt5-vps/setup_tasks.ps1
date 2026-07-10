$ErrorActionPreference = "Stop"

$ngrokBat = "C:\mt5-api\start-ngrok.bat"

if (!(Test-Path $ngrokBat)) { throw "$ngrokBat not found." }

$ngrokAction = New-ScheduledTaskAction -Execute $ngrokBat -WorkingDirectory "C:\mt5-api"
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -MultipleInstances IgnoreNew

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\mt5-api\setup_service.ps1"
Register-ScheduledTask -TaskName "TradeWay ngrok Tunnel" -Action $ngrokAction -Trigger @($startupTrigger, $logonTrigger) -Settings $settings -RunLevel Highest -Force

Write-Host "Scheduled tasks created:"
Write-Host "  TradeWay MT5 StartAtBoot"
Write-Host "  TradeWay MT5 Watchdog"
Write-Host "  TradeWay ngrok Tunnel"
