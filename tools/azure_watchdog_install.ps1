$watchdog = @'
$base = 'C:\mt5-api'
$logDir = Join-Path $base 'logs'
$accounts = Join-Path $base 'accounts.json'
$main = Join-Path $base 'main.py'
$python = Join-Path $base '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { $python = 'C:\Python311\python.exe' }
$watchdogLog = Join-Path $logDir 'watchdog.log'

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
function Log($message) { Add-Content -Path $watchdogLog -Value ((Get-Date -Format s) + ' ' + $message) }

if (-not (Test-Path $accounts)) {
  Set-Content -Path $accounts -Value '[]' -Encoding UTF8
  Log 'accounts.json created'
} else {
  try {
    $raw = Get-Content $accounts -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
      Set-Content -Path $accounts -Value '[]' -Encoding UTF8
      Log 'accounts.json empty and was reset'
    } else {
      $null = $raw | ConvertFrom-Json
    }
  } catch {
    Set-Content -Path $accounts -Value '[]' -Encoding UTF8
    Log ('accounts.json parse failed and was reset: ' + $_.Exception.Message)
  }
}

$running = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'python.exe' -and $_.CommandLine -like '*C:\mt5-api\main.py*'
} | Select-Object -First 1

if (-not $running) {
  if (-not (Test-Path $python)) { Log ('python missing: ' + $python); Write-Host 'python missing'; exit 1 }
  if (-not (Test-Path $main)) { Log ('main.py missing: ' + $main); Write-Host 'main missing'; exit 1 }
  Log ('Starting MT5 API worker via ' + $python)
  Start-Process -FilePath 'C:\Windows\System32\cmd.exe' -ArgumentList "/c start `"`" /b `"$python`" `"$main`"" -WorkingDirectory $base -WindowStyle Hidden
  Write-Host 'watchdog started worker'
} else {
  Log ('MT5 API already running PID=' + $running.ProcessId)
  Write-Host ('worker already running pid=' + $running.ProcessId)
}
'@

Set-Content -Path 'C:\mt5-api\watchdog.ps1' -Value $watchdog -Encoding UTF8
schtasks /Delete /TN "TradeWay MT5 StartAtBoot" /F 2>$null | Out-Null
schtasks /Delete /TN "TradeWay MT5 Watchdog" /F 2>$null | Out-Null
schtasks /Create /TN "TradeWay MT5 StartAtBoot" /SC ONSTART /RU SYSTEM /RL HIGHEST /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\mt5-api\watchdog.ps1" /F | Out-Null
schtasks /Create /TN "TradeWay MT5 Watchdog" /SC MINUTE /MO 5 /RU SYSTEM /RL HIGHEST /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\mt5-api\watchdog.ps1" /F | Out-Null
Write-Host 'watchdog installed'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\mt5-api\watchdog.ps1'
