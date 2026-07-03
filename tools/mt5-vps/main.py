from __future__ import annotations

import json
import os
import ssl
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

import certifi

try:
    import MetaTrader5 as mt5
except Exception:  # pragma: no cover - only happens when package is missing
    mt5 = None

BASE_DIR = Path(__file__).resolve().parent
ACCOUNTS_FILE = BASE_DIR / "accounts.json"
load_dotenv(BASE_DIR / ".env")

TRADEWAY_WEBHOOK_URL = os.getenv(
    "TRADEWAY_WEBHOOK_URL",
    "https://tradewayio.vercel.app/api/connectors/mt5/trades",
)
TRADEWAY_ACCOUNTS_URL = os.getenv(
    "TRADEWAY_ACCOUNTS_URL",
    "https://tradewayio.vercel.app/api/connectors/mt5/pending-accounts",
)
MT5_CONNECTOR_SECRET = os.getenv("MT5_CONNECTOR_SECRET", "")
DEFAULT_LOOKBACK_DAYS = int(os.getenv("MT5_LOOKBACK_DAYS", "1825"))
AUTO_LOOKBACK_DAYS = int(os.getenv("MT5_AUTO_LOOKBACK_DAYS", "3"))
INCREMENTAL_LOOKBACK_DAYS = int(os.getenv("MT5_INCREMENTAL_LOOKBACK_DAYS", "120"))
MT5_TERMINAL_PATH = os.getenv("MT5_TERMINAL_PATH", r"C:\Program Files\MetaTrader 5\terminal64.exe")
MT5_FORCE_RESTART_TERMINAL = os.getenv("MT5_FORCE_RESTART_TERMINAL", "false").lower() == "true"
SYNC_INTERVAL_SECONDS = max(10, int(os.getenv("MT5_SYNC_INTERVAL_SECONDS", "15")))
TRADE_POST_CHUNK_SIZE = max(25, min(250, int(os.getenv("MT5_TRADE_POST_CHUNK_SIZE", "100"))))
MT5_REQUIRE_AUTH = os.getenv("MT5_REQUIRE_AUTH", "false").lower() == "true"
MANUAL_FRESH_ATTEMPTS = max(1, int(os.getenv("MT5_MANUAL_FRESH_ATTEMPTS", "8")))
MANUAL_FRESH_WAIT_SECONDS = max(1.0, float(os.getenv("MT5_MANUAL_FRESH_WAIT_SECONDS", "3")))

app = FastAPI(title="TradeWay MT5 Auto Sync", version="1.2.0")
scheduler = BackgroundScheduler(timezone="UTC")


def https_context() -> ssl.SSLContext:
    return ssl.create_default_context(cafile=certifi.where())


class ConnectPayload(BaseModel):
    login: str
    password: str
    server: str
    user_id: str
    account_id: str | None = None
    prop_account_id: str | None = None


class SyncPayload(BaseModel):
    user_id: str | None = None
    account_id: str | None = None
    prop_account_id: str | None = None
    wait_for_new: bool = False
    fresh_attempts: int | None = Field(default=None, ge=1, le=20)
    fresh_wait_seconds: float | None = Field(default=None, ge=0.5, le=10)


class AccountRecord(BaseModel):
    login: str
    password: str
    server: str
    user_id: str
    account_id: str
    prop_account_id: str | None = None
    is_active: bool = True
    last_ticket: int | None = None
    last_sync_at: str | None = None
    last_error: str | None = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def require_api_auth(authorization: str | None) -> None:
    if not MT5_REQUIRE_AUTH:
        return
    if not MT5_CONNECTOR_SECRET or authorization != f"Bearer {MT5_CONNECTOR_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def read_accounts() -> list[dict[str, Any]]:
    if not ACCOUNTS_FILE.exists():
        return []
    data = json.loads(ACCOUNTS_FILE.read_text(encoding="utf-8-sig"))
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def write_accounts(accounts: list[dict[str, Any]]) -> None:
    ACCOUNTS_FILE.write_text(json.dumps(accounts, indent=2), encoding="utf-8")


def upsert_account(record: AccountRecord) -> None:
    accounts = read_accounts()
    key = record.account_id
    existing = next((account for account in accounts if account.get("account_id") == key), {})
    next_accounts = [account for account in accounts if account.get("account_id") != key]
    next_record = {
        **existing,
        **record.model_dump(),
        "last_ticket": existing.get("last_ticket"),
        "last_sync_at": existing.get("last_sync_at"),
        "last_error": existing.get("last_error"),
    }
    next_accounts.append(next_record)
    write_accounts(next_accounts)


def update_account(account_id: str, **patch: Any) -> None:
    accounts = read_accounts()
    for account in accounts:
        if account.get("account_id") == account_id:
            account.update(patch)
    write_accounts(accounts)


def chunked(items: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [items[index:index + size] for index in range(0, len(items), size)]


def fetch_remote_accounts() -> dict[str, Any]:
    if not MT5_CONNECTOR_SECRET:
        return {"fetched": 0, "error": "MT5_CONNECTOR_SECRET is missing in .env"}

    request = urllib.request.Request(
        TRADEWAY_ACCOUNTS_URL,
        method="GET",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {MT5_CONNECTOR_SECRET}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60, context=https_context()) as response:
            payload = json.loads(response.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")
        return {"fetched": 0, "error": f"Account fetch failed: {error.code} {body}"}
    except Exception as error:
        return {"fetched": 0, "error": f"Account fetch failed: {error}"}

    remote_accounts = payload.get("accounts") or []
    fetched = 0
    for item in remote_accounts:
        account_id = str(item.get("accountId") or "").strip()
        login = str(item.get("login") or "").strip()
        password = str(item.get("password") or "")
        server = str(item.get("server") or "").strip()
        user_id = str(item.get("userId") or "").strip()
        if not account_id or not login or not password or not server or not user_id:
            continue

        upsert_account(AccountRecord(
            login=login,
            password=password,
            server=server,
            user_id=user_id,
            account_id=account_id,
            prop_account_id=item.get("propAccountId"),
        ))
        fetched += 1

    return {"fetched": fetched, "failed": payload.get("failed") or []}


def require_mt5() -> Any:
    if mt5 is None:
        raise RuntimeError("MetaTrader5 Python package is not installed.")
    return mt5


def mt5_login(account: dict[str, Any]) -> None:
    terminal = require_mt5()
    try:
        terminal.shutdown()
    except Exception:
        pass
    if MT5_FORCE_RESTART_TERMINAL:
        subprocess.run(
            ["taskkill", "/IM", "terminal64.exe", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    terminal_path = MT5_TERMINAL_PATH if Path(MT5_TERMINAL_PATH).exists() else None
    initialize_kwargs = {
        "login": int(account["login"]),
        "password": str(account["password"]),
        "server": str(account["server"]),
        "timeout": 120000,
    }
    initialized = (
        terminal.initialize(path=terminal_path, **initialize_kwargs)
        if terminal_path
        else terminal.initialize(**initialize_kwargs)
    )
    if not initialized:
        code, message = terminal.last_error()
        raise RuntimeError(f"MT5 initialize failed: {code} {message}")
    if terminal.account_info() is None:
        ok = terminal.login(
            int(account["login"]),
            password=str(account["password"]),
            server=str(account["server"]),
            timeout=120000,
        )
        if not ok:
            code, message = terminal.last_error()
            raise RuntimeError(f"MT5 login failed: {code} {message}")


def history_deals_with_retry(terminal: Any, from_dt: datetime, to_dt: datetime) -> list[Any]:
    last_error: tuple[int, str] | None = None
    for attempt in range(1, 7):
        deals = terminal.history_deals_get(from_dt, to_dt)
        if deals is None:
            last_error = terminal.last_error()
        else:
            deal_list = list(deals)
            if deal_list or attempt >= 3:
                return deal_list
            last_error = terminal.last_error()
        time.sleep(min(attempt, 3))
    if last_error:
        code, message = last_error
        raise RuntimeError(f"MT5 history_deals_get failed: {code} {message}")
    return []


def iso_from_mt5_time(value: int | float | None) -> str | None:
    if not value:
        return None
    return datetime.fromtimestamp(float(value), tz=timezone.utc).isoformat()


def trade_side(deal_type: int) -> str:
    terminal = require_mt5()
    return "long" if deal_type == terminal.DEAL_TYPE_BUY else "short"


def normalize_deals_to_trades(deals: list[Any]) -> list[dict[str, Any]]:
    terminal = require_mt5()
    grouped: dict[str, list[Any]] = {}
    for deal in deals:
        position_id = str(getattr(deal, "position_id", "") or getattr(deal, "ticket", ""))
        grouped.setdefault(position_id, []).append(deal)

    trades: list[dict[str, Any]] = []
    for position_id, position_deals in grouped.items():
        ordered = sorted(position_deals, key=lambda item: getattr(item, "time", 0))
        entry_deals = [
            deal for deal in ordered
            if getattr(deal, "entry", None) in (terminal.DEAL_ENTRY_IN, terminal.DEAL_ENTRY_INOUT)
        ]
        exit_deals = [
            deal for deal in ordered
            if getattr(deal, "entry", None) in (terminal.DEAL_ENTRY_OUT, terminal.DEAL_ENTRY_INOUT)
        ]
        if not entry_deals or not exit_deals:
            continue

        entry = entry_deals[0]
        exit_deal = exit_deals[-1]
        symbol = str(getattr(exit_deal, "symbol", "") or getattr(entry, "symbol", "")).upper()
        if not symbol:
            continue

        commission = sum(float(getattr(deal, "commission", 0) or 0) for deal in ordered)
        swap = sum(float(getattr(deal, "swap", 0) or 0) for deal in ordered)
        gross_pnl = sum(float(getattr(deal, "profit", 0) or 0) for deal in exit_deals)
        net_pnl = gross_pnl + commission + swap
        volume = sum(float(getattr(deal, "volume", 0) or 0) for deal in exit_deals) or float(getattr(entry, "volume", 0) or 0)

        trades.append({
            "externalDealId": str(getattr(exit_deal, "ticket", "")),
            "externalPositionId": position_id,
            "symbol": symbol,
            "side": trade_side(int(getattr(entry, "type", terminal.DEAL_TYPE_BUY))),
            "volume": volume,
            "entryPrice": float(getattr(entry, "price", 0) or 0),
            "exitPrice": float(getattr(exit_deal, "price", 0) or 0),
            "commission": commission,
            "swap": swap,
            "grossPnl": gross_pnl,
            "netPnl": net_pnl,
            "openedAt": iso_from_mt5_time(getattr(entry, "time", None)),
            "closedAt": iso_from_mt5_time(getattr(exit_deal, "time", None)),
            "status": "closed",
            "rawPayload": {
                "entry": entry._asdict() if hasattr(entry, "_asdict") else str(entry),
                "exit": exit_deal._asdict() if hasattr(exit_deal, "_asdict") else str(exit_deal),
            },
        })
    return trades


def post_trade_chunk(account_id: str, trades: list[dict[str, Any]], *, finalize: bool) -> dict[str, Any]:
    if not trades:
        return {"imported": 0, "skipped": 0, "message": "No closed trades found."}
    if not MT5_CONNECTOR_SECRET:
        raise RuntimeError("MT5_CONNECTOR_SECRET is missing in .env")

    payload = json.dumps({"accountId": account_id, "trades": trades, "finalize": finalize}).encode("utf-8")
    request = urllib.request.Request(
        TRADEWAY_WEBHOOK_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MT5_CONNECTOR_SECRET}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60, context=https_context()) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {"ok": True}
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"TradeWay webhook failed: {error.code} {body}") from error


def post_trades(account_id: str, trades: list[dict[str, Any]]) -> dict[str, Any]:
    if not trades:
        return {"imported": 0, "skipped": 0, "journalImported": 0, "total": 0, "message": "No closed trades found."}

    chunks = chunked(trades, TRADE_POST_CHUNK_SIZE)
    totals: dict[str, Any] = {
        "imported": 0,
        "skipped": 0,
        "journalImported": 0,
        "total": 0,
        "chunks": len(chunks),
    }
    last_response: dict[str, Any] = {}
    for index, chunk in enumerate(chunks, start=1):
        response = post_trade_chunk(account_id, chunk, finalize=index == len(chunks))
        last_response = response
        totals["imported"] += int(response.get("imported", 0) or 0)
        totals["skipped"] += int(response.get("skipped", 0) or 0)
        totals["journalImported"] += int(response.get("journalImported", 0) or 0)
        totals["total"] += int(response.get("total", len(chunk)) or 0)
        print(f"[chunk] account={account_id} {index}/{len(chunks)} imported={response.get('imported', 0)} journal={response.get('journalImported', 0)}", flush=True)

    if last_response.get("traderox"):
        totals["traderox"] = last_response.get("traderox")
    totals["message"] = f"Imported {totals['journalImported']} journal trades in {len(chunks)} chunk(s)."
    return totals


def sync_account(
    account: dict[str, Any],
    *,
    auto_sync: bool = False,
    wait_for_new: bool = False,
    fresh_attempts: int | None = None,
    fresh_wait_seconds: float | None = None,
) -> dict[str, Any]:
    mt5_login(account)
    terminal = require_mt5()
    attempts = fresh_attempts or MANUAL_FRESH_ATTEMPTS
    wait_seconds = fresh_wait_seconds or MANUAL_FRESH_WAIT_SECONDS
    previous_ticket = int(account.get("last_ticket") or 0)
    deal_list: list[Any] = []
    last_ticket = 0

    for attempt in range(1, attempts + 1):
        to_dt = utc_now()
        lookback_days = DEFAULT_LOOKBACK_DAYS if not previous_ticket else (AUTO_LOOKBACK_DAYS if auto_sync else INCREMENTAL_LOOKBACK_DAYS)
        from_dt = to_dt - timedelta(days=lookback_days)
        deal_list = history_deals_with_retry(terminal, from_dt, to_dt)
        last_ticket = max((int(getattr(deal, "ticket", 0) or 0) for deal in deal_list), default=0)

        if not wait_for_new or not previous_ticket or last_ticket != previous_ticket:
            break
        if attempt < attempts:
            time.sleep(wait_seconds)

    if last_ticket and previous_ticket == last_ticket:
        update_account(account["account_id"], last_sync_at=utc_now().isoformat(), last_error=None)
        return {
            "success": True,
            "imported": 0,
            "skipped": 0,
            "total": 0,
            "latestTicket": last_ticket,
            "previousTicket": previous_ticket,
            "freshAttempts": attempts if wait_for_new else 1,
            "message": "No new MT5 ticket yet. Trade may still be updating in terminal history.",
        }

    trades = normalize_deals_to_trades(deal_list)
    result = post_trades(account["account_id"], trades)
    update_account(
        account["account_id"],
        last_ticket=last_ticket or account.get("last_ticket"),
        last_sync_at=utc_now().isoformat(),
        last_error=None,
    )
    return {
        "success": True,
        "total": len(trades),
        "latestTicket": last_ticket,
        "previousTicket": previous_ticket,
        "lookbackDays": DEFAULT_LOOKBACK_DAYS if not previous_ticket else (AUTO_LOOKBACK_DAYS if auto_sync else INCREMENTAL_LOOKBACK_DAYS),
        "freshAttempts": attempts if wait_for_new else 1,
        **result,
    }


def sync_all() -> None:
    fetch_result = fetch_remote_accounts()
    if fetch_result.get("error"):
        print(f"[accounts:error] {fetch_result['error']}", flush=True)
    else:
        print(f"[accounts] fetched={fetch_result.get('fetched', 0)}", flush=True)

    for account in read_accounts():
        if not account.get("is_active", True):
            continue
        try:
            result = sync_account(account, auto_sync=True)
            print(f"[sync] {account.get('login')} {result}", flush=True)
        except Exception as error:
            update_account(account["account_id"], last_error=str(error))
            print(f"[sync:error] {account.get('login')} {error}", flush=True)


@app.on_event("startup")
def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(sync_all, "interval", seconds=SYNC_INTERVAL_SECONDS, id="mt5-auto-sync", replace_existing=True)
        scheduler.start()


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "TradeWay MT5 Auto Sync",
        "accounts": len(read_accounts()),
        "webhookConfigured": bool(MT5_CONNECTOR_SECRET),
        "syncIntervalSeconds": SYNC_INTERVAL_SECONDS,
        "fullLookbackDays": DEFAULT_LOOKBACK_DAYS,
        "autoLookbackDays": AUTO_LOOKBACK_DAYS,
        "incrementalLookbackDays": INCREMENTAL_LOOKBACK_DAYS,
        "tradePostChunkSize": TRADE_POST_CHUNK_SIZE,
        "manualFreshAttempts": MANUAL_FRESH_ATTEMPTS,
        "manualFreshWaitSeconds": MANUAL_FRESH_WAIT_SECONDS,
    }


@app.get("/status")
def status(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_api_auth(authorization)
    accounts = read_accounts()
    fetch_result = fetch_remote_accounts()
    return {
        "ok": True,
        "accountFetch": fetch_result,
        "syncIntervalSeconds": SYNC_INTERVAL_SECONDS,
        "fullLookbackDays": DEFAULT_LOOKBACK_DAYS,
        "autoLookbackDays": AUTO_LOOKBACK_DAYS,
        "incrementalLookbackDays": INCREMENTAL_LOOKBACK_DAYS,
        "tradePostChunkSize": TRADE_POST_CHUNK_SIZE,
        "manualFreshAttempts": MANUAL_FRESH_ATTEMPTS,
        "manualFreshWaitSeconds": MANUAL_FRESH_WAIT_SECONDS,
        "accounts": [
            {
                "login": account.get("login"),
                "server": account.get("server"),
                "user_id": account.get("user_id"),
                "account_id": account.get("account_id"),
                "prop_account_id": account.get("prop_account_id"),
                "is_active": account.get("is_active", True),
                "last_ticket": account.get("last_ticket"),
                "last_sync_at": account.get("last_sync_at"),
                "last_error": account.get("last_error"),
            }
            for account in accounts
        ],
    }


@app.post("/connect")
def connect(payload: ConnectPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_api_auth(authorization)
    account_id = payload.account_id or payload.prop_account_id
    if not account_id:
        raise HTTPException(status_code=400, detail="account_id is required.")

    record = AccountRecord(
        login=payload.login.strip(),
        password=payload.password,
        server=payload.server.strip(),
        user_id=payload.user_id,
        account_id=account_id,
        prop_account_id=payload.prop_account_id,
    )
    upsert_account(record)
    try:
        mt5_login(record.model_dump())
        update_account(account_id, last_error=None)
        message = "MT5 connected and account saved."
    except Exception as error:
        update_account(account_id, last_error=str(error))
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {
        "success": True,
        "message": message,
        "account": {
            "login": record.login,
            "server": record.server,
            "user_id": record.user_id,
            "account_id": record.account_id,
            "prop_account_id": record.prop_account_id,
        },
    }


@app.post("/sync-now")
def sync_now(payload: SyncPayload | None = None, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_api_auth(authorization)
    payload = payload or SyncPayload()

    fetch_result = fetch_remote_accounts()
    accounts = read_accounts()
    if payload.account_id:
        accounts = [account for account in accounts if account.get("account_id") == payload.account_id]
    if payload.user_id:
        accounts = [account for account in accounts if account.get("user_id") == payload.user_id]
    if payload.prop_account_id:
        accounts = [account for account in accounts if account.get("prop_account_id") == payload.prop_account_id]
    if not accounts:
        raise HTTPException(status_code=404, detail="No matching MT5 account found.")

    results = []
    imported_total = 0
    journal_total = 0
    for account in accounts:
        result = sync_account(
            account,
            wait_for_new=payload.wait_for_new,
            fresh_attempts=payload.fresh_attempts,
            fresh_wait_seconds=payload.fresh_wait_seconds,
        )
        imported_total += int(result.get("imported", result.get("total", 0)) or 0)
        journal_total += int(result.get("journalImported", 0) or 0)
        results.append({
            "login": account.get("login"),
            "account_id": account.get("account_id"),
            "result": result,
        })
    return {
        "success": True,
        "imported": imported_total,
        "journalImported": journal_total,
        "total": len(results),
        "accountFetch": fetch_result,
        "results": results,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
