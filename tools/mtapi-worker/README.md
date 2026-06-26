# TradeWay MTAPI Worker

Docker worker for Premium MT5 Auto Sync.

The worker reads due `trading_accounts` from Supabase and calls:

`POST /api/connectors/mt5/sync`

with `Authorization: Bearer MT5_CONNECTOR_SECRET`.

It does not execute trades. It only imports closed MT5 history through MTAPI.

## Env

```bash
DATABASE_URL=postgresql://...
TRADEWAY_API_URL=https://tradewayio.vercel.app
MT5_CONNECTOR_SECRET=...
MTAPI_SYNC_LOOKBACK_DAYS=7
MTAPI_WORKER_POLL_SECONDS=300
```

## Build

```bash
docker build -f tools/mtapi-worker/Dockerfile -t tradeway-mtapi-worker .
```

## Run

```bash
docker run --env-file .env.mtapi-worker tradeway-mtapi-worker
```
