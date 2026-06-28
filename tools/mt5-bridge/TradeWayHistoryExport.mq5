//+------------------------------------------------------------------+
//| TradeWayHistoryExport                                            |
//| Read-only script: exports closed account deals to CSV.            |
//+------------------------------------------------------------------+
#property script_show_inputs

input int DaysBack = 90;
input string OutputFile = "tradeway_closed_trades.csv";

string DealEntryName(long value)
{
   if(value == DEAL_ENTRY_IN) return "IN";
   if(value == DEAL_ENTRY_OUT) return "OUT";
   if(value == DEAL_ENTRY_INOUT) return "INOUT";
   if(value == DEAL_ENTRY_OUT_BY) return "OUT_BY";
   return IntegerToString((int)value);
}

string DealTypeName(long value)
{
   if(value == DEAL_TYPE_BUY) return "BUY";
   if(value == DEAL_TYPE_SELL) return "SELL";
   return IntegerToString((int)value);
}

string Csv(string value)
{
   StringReplace(value, "\"", "\"\"");
   return "\"" + value + "\"";
}

void OnStart()
{
   datetime to = TimeCurrent();
   datetime from = to - (DaysBack * 24 * 60 * 60);

   if(!HistorySelect(from, to))
   {
      Print("TradeWay export failed: HistorySelect error ", GetLastError());
      return;
   }

   int handle = FileOpen(OutputFile, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(handle == INVALID_HANDLE)
   {
      Print("TradeWay export failed: FileOpen error ", GetLastError());
      return;
   }

   FileWrite(handle,
      "ticket",
      "position_id",
      "order_id",
      "symbol",
      "deal_type",
      "entry",
      "volume",
      "price",
      "commission",
      "swap",
      "profit",
      "time",
      "comment"
   );

   uint total = HistoryDealsTotal();
   for(uint index = 0; index < total; index++)
   {
      ulong ticket = HistoryDealGetTicket(index);
      if(ticket == 0) continue;

      FileWrite(handle,
         (string)ticket,
         (string)HistoryDealGetInteger(ticket, DEAL_POSITION_ID),
         (string)HistoryDealGetInteger(ticket, DEAL_ORDER),
         HistoryDealGetString(ticket, DEAL_SYMBOL),
         DealTypeName(HistoryDealGetInteger(ticket, DEAL_TYPE)),
         DealEntryName(HistoryDealGetInteger(ticket, DEAL_ENTRY)),
         DoubleToString(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2),
         DoubleToString(HistoryDealGetDouble(ticket, DEAL_PRICE), _Digits),
         DoubleToString(HistoryDealGetDouble(ticket, DEAL_COMMISSION), 2),
         DoubleToString(HistoryDealGetDouble(ticket, DEAL_SWAP), 2),
         DoubleToString(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2),
         TimeToString((datetime)HistoryDealGetInteger(ticket, DEAL_TIME), TIME_DATE | TIME_SECONDS),
         Csv(HistoryDealGetString(ticket, DEAL_COMMENT))
      );
   }

   FileClose(handle);
   Print("TradeWay export complete: ", total, " deals written to ", OutputFile);
}
