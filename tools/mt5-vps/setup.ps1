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
MT5_PRUNE_STALE_REMOTE_ACCOUNTS=true
MT5_FORCE_RESCAN_EVERY_CYCLES=20
MT5_SYNC_INTERVAL_SECONDS=5
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
$ErrorActionPreference = "Continue"

$baseDir = "C:\mt5-api"
$python = Join-Path $baseDir ".venv\Scripts\python.exe"
$main = Join-Path $baseDir "main.py"
$logDir = Join-Path $baseDir "logs"
$stdoutLog = Join-Path $logDir "server.log"
$watchdogLog = Join-Path $logDir "watchdog.log"
$mt5Terminal = $env:MT5_TERMINAL_PATH

if ([string]::IsNullOrWhiteSpace($mt5Terminal)) {
  $mt5Terminal = "C:\Program Files\MetaTrader 5\terminal64.exe"
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (!(Test-Path $python)) {
  throw "Python runtime not found: $python"
}

if (!(Test-Path $main)) {
  throw "FastAPI file not found: $main"
}

function Write-WatchdogLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date).ToString("s"), $Message
  Add-Content -Path $watchdogLog -Value $line
}

Set-Location $baseDir
Write-WatchdogLog "MT5 watchdog started."

while ($true) {
  try {
    if ((Test-Path $mt5Terminal) -and -not (Get-Process -Name "terminal64" -ErrorAction SilentlyContinue)) {
      Write-WatchdogLog "Launching MT5 terminal."
      Start-Process -FilePath $mt5Terminal -WindowStyle Minimized | Out-Null
      Start-Sleep -Seconds 8
    }

    Write-WatchdogLog "Launching FastAPI server."
    & $python $main *>> $stdoutLog
    $exitCode = $LASTEXITCODE
    Write-WatchdogLog "FastAPI exited with code $exitCode. Restarting in 5 seconds."
  } catch {
    Write-WatchdogLog "Watchdog error: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds 5
}
"@ | Set-Content -Encoding UTF8 "C:\mt5-api\run-server.ps1"

@"
$ErrorActionPreference = "Continue"

$legacyTasks = @(
  "TradeWay MT5 Auto Sync",
  "TradeWay MT5 User Sync",
  "TradeX MT5 FastAPI",
  "TradeWay MT5 API"
)

foreach ($task in $legacyTasks) {
  schtasks /Delete /TN $task /F | Out-Null
}

Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -match 'C:\\mt5-api\\main\.py|start_server_debug\.bat|start_server_background\.bat'
} | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

$startAtBootAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"C:\mt5-api\watchdog.ps1`""
$watchdogAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"C:\mt5-api\watchdog.ps1`""
$bootTrigger = New-ScheduledTaskTrigger -AtStartup
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date
$taskCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\mt5-api\watchdog.ps1"'
schtasks /Create /TN "TradeWay MT5 StartAtBoot" /SC ONSTART /RL HIGHEST /RU SYSTEM /TR $taskCommand /F | Out-Null
schtasks /Create /TN "TradeWay MT5 Watchdog" /SC MINUTE /MO 5 /RL HIGHEST /RU SYSTEM /TR $taskCommand /F | Out-Null
schtasks /Run /TN "TradeWay MT5 StartAtBoot" | Out-Null
"@ | Set-Content -Encoding UTF8 "C:\mt5-api\setup_service.ps1"

Write-Host "[7/8] Firewall, power, scheduled task..."
New-NetFirewallRule -DisplayName "TradeX MT5 API 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue | Out-Null
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /hibernate off

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\mt5-api\setup_service.ps1"

Write-Host "[8/8] Start server and MT5 installer..."
Start-Process "C:\installers\mt5setup.exe"
Start-Sleep -Seconds 4

try {
  (Invoke-WebRequest "http://localhost:8000" -UseBasicParsing -TimeoutSec 10).Content
} catch {
  Write-Host $_.Exception.Message
}

Write-Host "DONE: TradeWay VPS MT5 API setup finished."
