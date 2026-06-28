$ErrorActionPreference = "Stop"

Set-Location "C:\mt5-api"

if (!(Test-Path ".\main.py")) {
  throw "C:\mt5-api\main.py is missing. Copy your FastAPI server code first."
}
if (!(Test-Path ".\.env")) {
  throw "C:\mt5-api\.env is missing. Copy .env.example to .env and fill Supabase values first."
}
if (!(Test-Path ".\requirements.txt")) {
  throw "C:\mt5-api\requirements.txt is missing."
}

python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host "Python server dependencies installed."
Write-Host "Test with:"
Write-Host "  C:\mt5-api\start-api.bat"
