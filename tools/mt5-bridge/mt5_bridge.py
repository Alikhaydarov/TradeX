import os
from datetime import datetime, timezone
from typing import Any

import MetaTrader5 as mt5
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field


app = FastAPI(title="TradeWay MT5 Bridge")


class HistoryRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    login: str
    password: str
    server: str
    from_: str | None = Field(default=None, alias="from")
    to: str | None = None


def require_token(authorization: str | None) -> None:
    expected = os.environ.get("MT5_BRIDGE_TOKEN")
    if not expected or authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def parse_date(value: str | None, fallback: datetime) -> datetime:
    if not value:
        return fallback
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date: {value}") from exc


def deal_value(deal: Any, key: str, default: Any = None) -> Any:
    return getattr(deal, key, default)


@app.post("/history/closed-trades")
def closed_trades(payload: HistoryRequest, authorization: str | None = Header(default=None)):
    require_token(authorization)

    login = int(payload.login)
    if not mt5.initialize(login=login, password=payload.password, server=payload.server):
        code, message = mt5.last_error()
        raise HTTPException(status_code=400, detail=f"MT5 initialize failed: {code} {message}")

    try:
        if not mt5.login(login=login, password=payload.password, server=payload.server):
            code, message = mt5.last_error()
            raise HTTPException(status_code=400, detail=f"MT5 login failed: {code} {message}")

        now = datetime.now(timezone.utc)
        start = parse_date(payload.from_, now.replace(month=max(1, now.month - 3)))
        end = parse_date(payload.to, now)

        deals = mt5.history_deals_get(start, end)
        if deals is None:
            code, message = mt5.last_error()
            raise HTTPException(status_code=400, detail=f"History read failed: {code} {message}")

        positions: dict[str, dict[str, Any]] = {}
        for deal in deals:
            position_id = str(deal_value(deal, "position_id", deal_value(deal, "order", "")))
            if not position_id:
                continue
            entry = deal_value(deal, "entry", 0)
            row = positions.setdefault(position_id, {
                "externalPositionId": position_id,
                "externalDealId": str(deal_value(deal, "ticket", position_id)),
                "symbol": deal_value(deal, "symbol", ""),
                "side": "Long" if deal_value(deal, "type", 0) == mt5.DEAL_TYPE_BUY else "Short",
                "volume": 0,
                "entryPrice": None,
                "exitPrice": None,
                "commission": 0,
                "swap": 0,
                "grossPnl": 0,
                "netPnl": 0,
                "openedAt": None,
                "closedAt": None,
                "status": "closed",
            })
            price = float(deal_value(deal, "price", 0) or 0)
            time_value = datetime.fromtimestamp(deal_value(deal, "time", 0), tz=timezone.utc).isoformat()
            row["commission"] += float(deal_value(deal, "commission", 0) or 0)
            row["swap"] += float(deal_value(deal, "swap", 0) or 0)
            row["grossPnl"] += float(deal_value(deal, "profit", 0) or 0)
            row["netPnl"] = row["grossPnl"] + row["commission"] + row["swap"]

            if entry == mt5.DEAL_ENTRY_IN:
                row["entryPrice"] = price
                row["openedAt"] = time_value
                row["volume"] = float(deal_value(deal, "volume", 0) or 0)
            elif entry in (mt5.DEAL_ENTRY_OUT, mt5.DEAL_ENTRY_OUT_BY):
                row["externalDealId"] = str(deal_value(deal, "ticket", position_id))
                row["exitPrice"] = price
                row["closedAt"] = time_value

        closed = [trade for trade in positions.values() if trade["entryPrice"] and trade["exitPrice"]]
        closed.sort(key=lambda item: item.get("closedAt") or "", reverse=True)
        return {"trades": closed}
    finally:
        mt5.shutdown()
