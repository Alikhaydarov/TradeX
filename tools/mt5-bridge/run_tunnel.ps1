$ErrorActionPreference = "Stop"

$bridgeUrl = "http://127.0.0.1:8787"
$logPath = "C:\mt5-api\cloudflared.log"
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue

if (!$cloudflared) {
  $defaultPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
  if (Test-Path $defaultPath) {
    $cloudflaredPath = $defaultPath
  } else {
    throw "cloudflared is not installed. Install it with: winget install --id Cloudflare.cloudflared"
  }
} else {
  $cloudflaredPath = $cloudflared.Source
}

if (Test-Path $logPath) {
  Remove-Item $logPath -Force
}

Start-Process -FilePath $cloudflaredPath -ArgumentList "tunnel", "--url", $bridgeUrl, "--logfile", $logPath, "--loglevel", "info" -WindowStyle Hidden
Start-Sleep -Seconds 8

$log = Get-Content $logPath -ErrorAction SilentlyContinue
$url = ($log | Select-String -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1).Matches.Value

if (!$url) {
  throw "Tunnel started, but public URL was not found in $logPath."
}

Write-Output "MT5 bridge tunnel URL:"
Write-Output $url
Write-Output ""
Write-Output "Set this on Vercel as MT5_BRIDGE_BASE_URL, then redeploy."
