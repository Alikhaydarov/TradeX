$ErrorActionPreference = "Stop"

$token = $env:MT5_BRIDGE_TOKEN
if (!$token -and (Test-Path ".env")) {
  $token = (Get-Content ".env" | Where-Object { $_ -match "^MT5_BRIDGE_TOKEN=" } | Select-Object -First 1) -replace "^MT5_BRIDGE_TOKEN=", ""
}
if (!$token) {
  throw "MT5_BRIDGE_TOKEN is missing."
}

Invoke-RestMethod -Uri "http://127.0.0.1:8787/health"
Invoke-RestMethod -Uri "http://127.0.0.1:8787/status" -Headers @{ Authorization = "Bearer $token" }
