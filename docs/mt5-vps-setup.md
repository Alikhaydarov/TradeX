# TradeWay MT5 Auto Sync on AlaVPS Windows Server

Goal:

```text
AlaVPS Windows Server 24/7
  -> MT5 Terminal
  -> Python FastAPI on C:\mt5-api, port 8000
  -> APScheduler every 5 minutes
  -> Supabase tables: mt5_accounts, trades
  -> Vercel reads Supabase
```

## 1. Copy Files

On the VPS, create:

```powershell
mkdir C:\mt5-api
```

Copy your `main.py` into:

```text
C:\mt5-api\main.py
```

Copy these files from this repo folder `tools/mt5-vps` into `C:\mt5-api`:

```text
requirements.txt
.env.example
setup_python.ps1
start-api.bat
start-ngrok.bat
setup_tasks.ps1
test-api.ps1
```

Rename:

```powershell
copy C:\mt5-api\.env.example C:\mt5-api\.env
notepad C:\mt5-api\.env
```

Fill:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY
PORT=8000
NGROK_AUTHTOKEN=YOUR_NGROK_TOKEN
```

## 2. Install Prerequisites

Run PowerShell as Administrator:

```powershell
cd C:\mt5-api
.\install_prereqs.ps1
```

Then run:

```powershell
C:\Install\mt5setup.exe
```

In MT5:

1. Login to demo or investor account.
2. Tick `Save password`.
3. Confirm market watch/chart updates.
4. Keep MT5 installed and available.

## 3. Install Python Packages

```powershell
cd C:\mt5-api
.\setup_python.ps1
```

Verify:

```powershell
C:\mt5-api\.venv\Scripts\python.exe --version
```

Expected:

```text
Python 3.11.x
```

## 4. Run API

```powershell
C:\mt5-api\start-api.bat
```

Open:

```text
http://localhost:8000
```

Test:

```powershell
C:\mt5-api\test-api.ps1
```

## 5. Run ngrok

```powershell
C:\mt5-api\start-ngrok.bat
```

Copy the public URL:

```text
https://abc123.ngrok-free.app
```

Test:

```powershell
C:\mt5-api\test-api.ps1 https://abc123.ngrok-free.app
```

## 6. Vercel

Add production env:

```env
MT5_API_URL=https://abc123.ngrok-free.app
```

Redeploy production.

If this TradeWay deployment uses self-hosted bridge env instead, set:

```env
MT5_BRIDGE_BASE_URL=https://abc123.ngrok-free.app
```

## 7. Test Connect

```powershell
$body = @{
  login="474033941"
  password="YOUR_PASSWORD"
  server="Exness-MT5Trial15"
  user_id="SUPABASE_USER_ID"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://abc123.ngrok-free.app/connect" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Then check Supabase:

```sql
select * from mt5_accounts order by created_at desc;
select * from trades order by close_time desc limit 20;
```

Wait 5 minutes and confirm new trades are imported.

## 8. Auto Start on Boot

Run PowerShell as Administrator:

```powershell
cd C:\mt5-api
.\setup_tasks.ps1
```

Open Task Scheduler and confirm:

```text
TradeWay MT5 API
TradeWay ngrok Tunnel
```

## 9. Keep VPS Awake

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /hibernate off
```

Reduce Windows auto-restart:

```powershell
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 1 /f
```

## Troubleshooting

`MetaTrader5 initialize failed`:

- MT5 must be installed on the same VPS.
- MT5 and Python must be 64-bit.
- Login once manually in MT5 and tick `Save password`.
- Do not run many MT5 terminal instances for the same account.
- Use Python 3.11.

Port 8000 busy:

```powershell
netstat -ano | findstr :8000
taskkill /PID PID_NUMBER /F
```

ngrok URL changes after restart:

- Free ngrok URLs are temporary.
- For production use reserved ngrok domain or Cloudflare named tunnel.

Check API logs:

```powershell
cd C:\mt5-api
python main.py
```

Check scheduled task runs:

```powershell
Get-ScheduledTask -TaskName "TradeWay MT5 API"
Get-ScheduledTask -TaskName "TradeWay ngrok Tunnel"
```
