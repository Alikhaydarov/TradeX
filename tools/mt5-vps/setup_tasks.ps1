$ErrorActionPreference = "Stop"

$apiBat = "C:\mt5-api\start-api.bat"
$ngrokBat = "C:\mt5-api\start-ngrok.bat"

if (!(Test-Path $apiBat)) { throw "$apiBat not found." }
if (!(Test-Path $ngrokBat)) { throw "$ngrokBat not found." }

$apiAction = New-ScheduledTaskAction -Execute $apiBat -WorkingDirectory "C:\mt5-api"
$ngrokAction = New-ScheduledTaskAction -Execute $ngrokBat -WorkingDirectory "C:\mt5-api"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName "TradeWay MT5 API" -Action $apiAction -Trigger $trigger -Settings $settings -RunLevel Highest -Force
Register-ScheduledTask -TaskName "TradeWay ngrok Tunnel" -Action $ngrokAction -Trigger $trigger -Settings $settings -RunLevel Highest -Force

Write-Host "Scheduled tasks created:"
Write-Host "  TradeWay MT5 API"
Write-Host "  TradeWay ngrok Tunnel"
