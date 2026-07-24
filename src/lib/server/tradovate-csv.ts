import crypto from "node:crypto";

export type TradovateCsvAccount = {
  id: string;
  name: string;
  market_type?: string | null;
  account_size?: string | number | null;
  profit_target?: string | number | null;
  max_drawdown?: string | number | null;
};

export type TradovateCsvJournalRow = {
  user_id: string;
  prop_account_id: string;
  symbol: string;
  side: "Long" | "Short";
  entry_price: number;
  exit_price: number;
  quantity: number;
  fees: number;
  pnl: number;
  note: string;
  traded_at: string;
  account_name: string;
  market_type: string;
  setup: string;
  risk_amount: number;
  result_r: number;
  account_size: number;
  profit_target: number;
  max_drawdown: number;
  external_source: "tradovate_csv";
  external_id: string;
};

type CsvRecord = Record<string, string>;

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function guessDelimiter(text: string) {
  const sample = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = [",", ";", "\t"];
  return candidates.sort((left, right) => sample.split(right).length - sample.split(left).length)[0];
}

function parseCsvRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function parseCsv(text: string): CsvRecord[] {
  const rows = parseCsvRows(text, guessDelimiter(text));
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeKey);
  return rows.slice(1).map((cells) =>
    headers.reduce<CsvRecord>((record, header, index) => {
      if (header) record[header] = cells[index] || "";
      return record;
    }, {}),
  );
}

function field(record: CsvRecord, aliases: string[]) {
  for (const alias of aliases) {
    const value = record[normalizeKey(alias)];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function numeric(value: string, fallback = 0) {
  if (!value) return fallback;
  const negativeByParentheses = /^\s*\(.*\)\s*$/.test(value);
  const normalized = value
    .replace(/[()]/g, "")
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return negativeByParentheses ? -Math.abs(parsed) : parsed;
}

function numericField(record: CsvRecord, aliases: string[]) {
  const raw = field(record, aliases);
  return { found: raw !== "", value: numeric(raw) };
}

function dateOnly(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const normalized = value.replace(/\./g, "-").replace(/\//g, "-");
  const match = normalized.match(/(\d{1,4})-(\d{1,2})-(\d{1,4})/);
  if (!match) return "";

  const [, first, second, third] = match;
  if (first.length === 4) {
    return `${first}-${second.padStart(2, "0")}-${third.padStart(2, "0")}`;
  }

  const year = third.length === 2 ? `20${third}` : third;
  return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
}

function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sideFrom(record: CsvRecord, buyTime: string, sellTime: string): "Long" | "Short" {
  const raw = field(record, ["side", "direction", "position side", "trade direction", "buy/sell", "b/s"]);
  if (/short|sell|^s$/i.test(raw)) return "Short";
  if (/long|buy|^b$/i.test(raw)) return "Long";

  const boughtAt = timestamp(buyTime);
  const soldAt = timestamp(sellTime);
  if (boughtAt && soldAt) return boughtAt <= soldAt ? "Long" : "Short";
  return "Long";
}

function hashRecord(record: CsvRecord) {
  return crypto.createHash("sha1").update(JSON.stringify(record)).digest("hex").slice(0, 28);
}

function sumFees(record: CsvRecord) {
  const keys = [
    "commission",
    "commissions",
    "fees",
    "fee",
    "total fees",
    "clearing fee",
    "exchange fee",
    "nfa fee",
    "brokerage fee",
  ];
  const used = new Set<string>();
  return keys.reduce((total, alias) => {
    const key = normalizeKey(alias);
    if (used.has(key) || !(key in record)) return total;
    used.add(key);
    return total + Math.abs(numeric(record[key]));
  }, 0);
}

export function parseTradovateCsvToJournalRows(params: {
  text: string;
  userId: string;
  account: TradovateCsvAccount;
}) {
  const records = parseCsv(params.text);
  const accountSize = numeric(String(params.account.account_size || 0));
  const profitTarget = numeric(String(params.account.profit_target || 0));
  const maxDrawdown = numeric(String(params.account.max_drawdown || 0));
  let skipped = 0;

  const rows = records.flatMap<TradovateCsvJournalRow>((record) => {
    const symbol = field(record, ["contract", "symbol", "product", "instrument", "contract name"])
      .replace(/\s+/g, "")
      .toUpperCase();
    const quantity = Math.abs(numeric(field(record, ["quantity", "qty", "contracts", "size"]), 1));
    const buyTime = field(record, ["bought timestamp", "buy timestamp", "bought time", "buy time"]);
    const sellTime = field(record, ["sold timestamp", "sell timestamp", "sold time", "sell time"]);
    const side = sideFrom(record, buyTime, sellTime);

    const directEntry = numericField(record, ["entry price", "open price", "opening price", "average entry price", "avg entry price"]);
    const directExit = numericField(record, ["exit price", "close price", "closing price", "average exit price", "avg exit price"]);
    const buyPrice = numeric(field(record, ["buy price", "bought price", "average buy price"]));
    const sellPrice = numeric(field(record, ["sell price", "sold price", "average sell price"]));
    const entryPrice = directEntry.found ? directEntry.value : side === "Long" ? buyPrice : sellPrice;
    const exitPrice = directExit.found ? directExit.value : side === "Long" ? sellPrice : buyPrice;

    const entryTime = field(record, ["entry time", "open time", "opening time", "start time"]) || (side === "Long" ? buyTime : sellTime);
    const exitTime = field(record, ["exit time", "close time", "closing time", "end time", "timestamp"]) || (side === "Long" ? sellTime : buyTime);
    const tradeDate = dateOnly(exitTime || entryTime);
    const pnlField = numericField(record, [
      "p/l",
      "pl",
      "pnl",
      "profit/loss",
      "profit loss",
      "realized p/l",
      "realized pl",
      "realized pnl",
      "net p/l",
      "net pl",
      "net pnl",
      "profit",
    ]);

    if (!symbol || !tradeDate || !quantity || !pnlField.found) {
      skipped += 1;
      return [];
    }

    const externalId = field(record, ["position id", "positionid", "trade id", "tradeid", "order id", "id"]) || hashRecord(record);

    return [{
      user_id: params.userId,
      prop_account_id: params.account.id,
      symbol,
      side,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      fees: Number(sumFees(record).toFixed(2)),
      pnl: Number(pnlField.value.toFixed(2)),
      note: "Imported from Tradovate Position History CSV",
      traded_at: tradeDate,
      account_name: params.account.name,
      market_type: params.account.market_type || "Futures",
      setup: "Tradovate import",
      risk_amount: 0,
      result_r: 0,
      account_size: accountSize,
      profit_target: profitTarget,
      max_drawdown: maxDrawdown,
      external_source: "tradovate_csv",
      external_id: String(externalId),
    }];
  });

  return { rows, scanned: records.length, skipped };
}
