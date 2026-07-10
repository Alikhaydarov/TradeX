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

function Write-WatchdogLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date).ToString("s"), $Message
  Add-Content -Path $watchdogLog -Value $line
}

if (!(Test-Path $python)) {
  throw "Python runtime not found: $python"
}

if (!(Test-Path $main)) {
  throw "FastAPI file not found: $main"
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
    $process = Start-Process -FilePath $python `
      -ArgumentList $main `
      -WorkingDirectory $baseDir `
      -RedirectStandardOutput $stdoutLog `
      -RedirectStandardError $stdoutLog `
      -PassThru `
      -WindowStyle Hidden

    Wait-Process -Id $process.Id
    Write-WatchdogLog "FastAPI exited with code $($process.ExitCode). Restarting in 5 seconds."
  } catch {
    Write-WatchdogLog "Watchdog error: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds 5
}
