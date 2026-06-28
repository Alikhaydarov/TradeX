$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path "C:\Install" | Out-Null
New-Item -ItemType Directory -Force -Path "C:\mt5-api" | Out-Null

Write-Host "Installing Python 3.11 with winget..."
winget install --id Python.Python.3.11 --accept-source-agreements --accept-package-agreements --silent

Write-Host "Installing cloudflared as optional tunnel fallback..."
winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements --silent

Write-Host "Downloading ngrok..."
curl.exe -L -o "C:\Install\ngrok.zip" "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
Expand-Archive "C:\Install\ngrok.zip" -DestinationPath "C:\ngrok" -Force

Write-Host "Downloading MetaTrader 5 installer..."
curl.exe -L -o "C:\Install\mt5setup.exe" "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"

Write-Host ""
Write-Host "Open C:\Install\mt5setup.exe manually, install MT5, then login and save password."
Write-Host "After copying main.py/.env/requirements.txt into C:\mt5-api, run:"
Write-Host "  C:\mt5-api\setup_python.ps1"
