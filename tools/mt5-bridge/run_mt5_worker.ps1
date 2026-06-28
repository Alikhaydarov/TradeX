$ErrorActionPreference = "Stop"

$envPath = "C:\mt5-api\.env"

if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (!$line -or $line.StartsWith("#") -or !$line.Contains("=")) {
      return
    }
    $key, $value = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
  }
}

if (!$env:MT5_BRIDGE_BASE_URL) {
  $env:MT5_BRIDGE_BASE_URL = "http://127.0.0.1:8787"
}
if (!$env:TRADEWAY_API_URL) {
  $env:TRADEWAY_API_URL = "https://tradewayio.vercel.app"
}
if (!$env:MT5_WORKER_POLL_MS) {
  $env:MT5_WORKER_POLL_MS = "15000"
}

node (Join-Path $PSScriptRoot "mt5_worker.js")
