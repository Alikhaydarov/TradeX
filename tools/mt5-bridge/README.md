# TradeWay MT5 Bridge

This bridge is for read-only MT5 trade history sync. It must run on a Windows machine or VPS where the MetaTrader 5 terminal is installed and logged in-capable.

It does not send orders, close trades, or modify positions.

## Setup

```powershell
cd tools/mt5-bridge
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:MT5_BRIDGE_TOKEN="choose-a-long-random-token"
$env:MT5_TERMINAL_PATH="C:\Program Files\MetaTrader 5\terminal64.exe"
uvicorn mt5_bridge:app --host 0.0.0.0 --port 8787
```

Then set these env variables on Vercel:

```text
MT5_BRIDGE_BASE_URL=https://your-bridge-domain.example
MT5_BRIDGE_TOKEN=the-same-token
```

## Health checks

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
Invoke-RestMethod http://127.0.0.1:8787/status -Headers @{ Authorization = "Bearer your-token" }
```

## Temporary public tunnel

For local testing from Vercel, install Cloudflare Tunnel and expose the bridge:

```powershell
winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
.\run_tunnel.ps1
```

Copy the printed `https://...trycloudflare.com` URL into Vercel:

```text
MT5_BRIDGE_BASE_URL=https://your-quick-tunnel.trycloudflare.com
MT5_BRIDGE_TOKEN=the-same-token-from-.env
```

Quick tunnels are for testing only. Production should use a named Cloudflare Tunnel, static domain, or Windows VPS.

## Local sync worker

The app queues MT5 sync jobs quickly. The Windows laptop should run a local worker so long MT5 reads do not time out inside Vercel Functions.

Add these local-only values to `C:\mt5-api\.env`:

```text
DATABASE_URL=your-supabase-pooler-url
CONNECTOR_ENCRYPTION_KEY=the-same-key-used-by-vercel
MT5_CONNECTOR_SECRET=the-same-secret-used-by-vercel
TRADEWAY_API_URL=https://tradewayio.vercel.app
```

Then run:

```powershell
.\run_mt5_worker.ps1
```

Flow:

```text
MT5 terminal -> Python bridge -> local worker -> TradeWay import API -> Supabase
```

TradeWay will call `/history/closed-trades`, import closed MT5 deals into `trades`, and mirror them into `journal_entries` by trade date.
