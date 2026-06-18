#property copyright "TradeWay"
#property version   "1.00"
#property strict

input string TradeWayEndpoint = "https://your-domain.com/api/mt5/import";
input string TradeWayToken = "";
input int SyncIntervalSeconds = 30;
input int HistoryDays = 365;

datetime lastSync = 0;

string EscapeJson(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "");
   StringReplace(value, "\n", "\\n");
   return value;
}

string IsoTime(datetime value)
{
   MqlDateTime dt;
   TimeToStruct(value, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ", dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

bool SendBatch(string trades)
{
   string body = StringFormat("{\"accountLogin\":\"%I64d\",\"server\":\"%s\",\"trades\":[%s]}",
      AccountInfoInteger(ACCOUNT_LOGIN), EscapeJson(AccountInfoString(ACCOUNT_SERVER)), trades);
   char payload[], response[];
   string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + TradeWayToken + "\r\n";
   string responseHeaders;
   StringToCharArray(body, payload, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(payload, ArraySize(payload) - 1);
   ResetLastError();
   int status = WebRequest("POST", TradeWayEndpoint, headers, 15000, payload, response, responseHeaders);
   if(status < 200 || status >= 300)
   {
      Print("TradeWay sync failed. HTTP=", status, " error=", GetLastError(), " response=", CharArrayToString(response));
      return false;
   }
   Print("TradeWay sync successful: ", CharArrayToString(response));
   return true;
}

void SyncHistory()
{
   if(StringLen(TradeWayToken) < 20 || StringFind(TradeWayEndpoint, "https://") != 0)
   {
      Print("TradeWayEndpoint and TradeWayToken must be configured.");
      return;
   }

   datetime endTime = TimeCurrent();
   datetime startTime = lastSync > 0 ? lastSync - 86400 : endTime - HistoryDays * 86400;
   if(!HistorySelect(startTime, endTime))
   {
      Print("HistorySelect failed: ", GetLastError());
      return;
   }

   string json = "";
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      ENUM_DEAL_ENTRY entryType = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_OUT_BY) continue;

      ulong positionId = (ulong)HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
      string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      double exitPrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
      double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
      datetime closedAt = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      ENUM_DEAL_TYPE exitType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      string side = exitType == DEAL_TYPE_SELL ? "Long" : "Short";

      double entryPrice = 0;
      int dealTotal = HistoryDealsTotal();
      for(int j = 0; j < dealTotal; j++)
      {
         ulong candidate = HistoryDealGetTicket(j);
         if((ulong)HistoryDealGetInteger(candidate, DEAL_POSITION_ID) != positionId) continue;
         if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(candidate, DEAL_ENTRY) == DEAL_ENTRY_IN)
         {
            entryPrice = HistoryDealGetDouble(candidate, DEAL_PRICE);
            break;
         }
      }
      if(entryPrice <= 0 || exitPrice <= 0 || volume <= 0) continue;

      string item = StringFormat("{\"id\":\"%I64u\",\"symbol\":\"%s\",\"side\":\"%s\",\"entry\":%.8f,\"exit\":%.8f,\"volume\":%.4f,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"closedAt\":\"%s\"}",
         positionId, EscapeJson(symbol), side, entryPrice, exitPrice, volume, profit, commission, swap, IsoTime(closedAt));
      if(StringLen(json) > 0) json += ",";
      json += item;
   }

   if(StringLen(json) == 0)
   {
      lastSync = endTime;
      return;
   }
   if(SendBatch(json)) lastSync = endTime;
}

int OnInit()
{
   EventSetTimer(MathMax(10, SyncIntervalSeconds));
   SyncHistory();
   return INIT_SUCCEEDED;
}

void OnTimer()
{
   SyncHistory();
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}
