param(
  [Parameter(Mandatory = $true)]
  [string]$Secret,

  [string]$WebhookUrl = "https://tradewayio.vercel.app/api/connectors/mt5/trades",

  [string]$AccountsUrl = "https://tradewayio.vercel.app/api/connectors/mt5/pending-accounts"
)

$ErrorActionPreference = "Continue"

New-Item -ItemType Directory -Force C:\installers, C:\mt5-api, C:\mt5-api\logs | Out-Null

Write-Host "[1/8] Python..."
if (!(Test-Path "C:\Python311\python.exe")) {
  Invoke-WebRequest "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" -OutFile "C:\installers\python-3.11.9-amd64.exe"
  Start-Process "C:\installers\python-3.11.9-amd64.exe" -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 TargetDir=C:\Python311" -Wait
}
$env:Path += ";C:\Python311;C:\Python311\Scripts"

Write-Host "[2/8] MT5 installer..."
Invoke-WebRequest "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe" -OutFile "C:\installers\mt5setup.exe"
Unblock-File "C:\installers\mt5setup.exe"

Write-Host "[3/8] TradeWay server..."
Invoke-WebRequest "https://raw.githubusercontent.com/Alikhaydarov/TradeX/main/tools/mt5-vps/main.py" -OutFile "C:\mt5-api\main.py"

Write-Host "[4/8] Env and requirements..."
@"
TRADEWAY_WEBHOOK_URL=$WebhookUrl
TRADEWAY_ACCOUNTS_URL=$AccountsUrl
MT5_CONNECTOR_SECRET=$Secret
MT5_LOOKBACK_DAYS=1825
MT5_AUTO_LOOKBACK_DAYS=3
MT5_INCREMENTAL_LOOKBACK_DAYS=120
MT5_TRADE_POST_CHUNK_SIZE=100
MT5_SYNC_INTERVAL_SECONDS=15
"@ | Set-Content -Encoding UTF8 "C:\mt5-api\.env"

@"
fastapi
uvicorn[standard]
apscheduler
supabase
python-dotenv
MetaTrader5
pydantic
certifi
"@ | Set-Content -Encoding UTF8 "C:\mt5-api\requirements.txt"

Write-Host "[5/8] Python dependencies..."
if (!(Test-Path "C:\mt5-api\.venv\Scripts\python.exe")) {
  C:\Python311\python.exe -m venv C:\mt5-api\.venv
}
C:\mt5-api\.venv\Scripts\python.exe -m pip install --upgrade pip
C:\mt5-api\.venv\Scripts\pip.exe install -r C:\mt5-api\requirements.txt

Write-Host "[6/8] Start scripts..."
@"
@echo off
cd /d C:\mt5-api
call C:\mt5-api\.venv\Scripts\activate.bat
python C:\mt5-api\main.py >> C:\mt5-api\logs\server.log 2>&1
"@ | Set-Content -Encoding ASCII "C:\mt5-api\start_server_debug.bat"

@"
@echo off
cd /d C:\mt5-api
call C:\mt5-api\.venv\Scripts\activate.bat
pythonw C:\mt5-api\main.py
"@ | Set-Content -Encoding ASCII "C:\mt5-api\start_server_background.bat"

Write-Host "[7/8] Firewall, power, scheduled task..."
New-NetFirewallRule -DisplayName "TradeX MT5 API 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue | Out-Null
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /hibernate off

$Action = New-ScheduledTaskAction -Execute "C:\mt5-api\start_server_background.bat" -WorkingDirectory "C:\mt5-api"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "TradeX MT5 FastAPI" -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force -Description "TradeX MT5 auto-sync FastAPI server" | Out-Null

Write-Host "[8/8] Start server and MT5 installer..."
Start-Process "C:\mt5-api\start_server_background.bat"
Start-Process "C:\installers\mt5setup.exe"
Start-Sleep -Seconds 4

try {
  (Invoke-WebRequest "http://localhost:8000" -UseBasicParsing -TimeoutSec 10).Content
} catch {
  Write-Host $_.Exception.Message
}

Write-Host "DONE: TradeWay VPS MT5 API setup finished."
