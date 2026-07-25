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

type ParsedCsv = {
  records: CsvRecord[];
  headers: string[];
  headerRows: number;
};

const SYMBOL_ALIASES = ["contract", "contract name", "symbol", "product", "instrument"];
const QUANTITY_ALIASES = [
  "paired qty",
  "paired quantity",
  "quantity",
  "qty",
  "contracts",
  "size",
  "bought",
  "sold",
];
const PNL_ALIASES = [
  "p/l",
  "pl",
  "pnl",
  "profit/loss",
  "profit loss",
  "profit and loss",
  "realized p/l",
  "realized pnl",
  "net p/l",
  "net pnl",
  "net profit",
  "profit",
];
const BUY_PRICE_ALIASES = ["buy price", "bought price", "avg. buy", "avg buy", "average buy price"];
const SELL_PRICE_ALIASES = ["sell price", "sold price", "avg. sell", "avg sell", "average sell price"];
const ENTRY_PRICE_ALIASES = ["entry price", "open price", "opening price", "average entry price"];
const EXIT_PRICE_ALIASES = ["exit price", "close price", "closing price", "average exit price"];
const DATE_ALIASES = [
  "trade date",
  "timestamp",
  "bought timestamp",
  "sold timestamp",
  "entry time",
  "exit time",
  "open time",
  "close time",
  "date",
];

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function normalizedSet(values: string[]) {
  return new Set(values.map(normalizeKey).filter(Boolean));
}

function hasAny(cells: Set<string>, aliases: string[]) {
  return aliases.some((alias) => cells.has(normalizeKey(alias)));
}

function headerScore(row: string[]) {
  const cells = normalizedSet(row);
  let score = 0;
  if (hasAny(cells, SYMBOL_ALIASES)) score += 4;
  if (hasAny(cells, QUANTITY_ALIASES)) score += 2;
  if (hasAny(cells, PNL_ALIASES)) score += 4;
  if (hasAny(cells, DATE_ALIASES)) score += 2;
  if (hasAny(cells, BUY_PRICE_ALIASES) || hasAny(cells, SELL_PRICE_ALIASES)) score += 2;
  return score;
}

function parseCsvRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "").replace(/\u0000/g, "");

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

function delimiterScore(text: string, delimiter: string) {
  const rows = parseCsvRows(text, delimiter).slice(0, 150);
  const bestHeader = rows.reduce((best, row) => Math.max(best, headerScore(row)), 0);
  const usefulRows = rows.filter((row) => row.length >= 8).length;
  const widest = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return bestHeader * 100 + Math.min(usefulRows, 40) * 2 + Math.min(widest, 50);
}

function guessDelimiter(text: string) {
  return [",", ";", "\t"].reduce((best, candidate) => (
    delimiterScore(text, candidate) > delimiterScore(text, best) ? candidate : best
  ), ",");
}

function isRepeatedHeader(cells: string[], headers: string[]) {
  const normalizedCells = cells.map(normalizeKey);
  const matches = normalizedCells.reduce((count, value, index) => (
    value && value === headers[index] ? count + 1 : count
  ), 0);
  return matches >= Math.min(4, headers.filter(Boolean).length);
}

function parseCsv(text: string): ParsedCsv {
  const rows = parseCsvRows(text, guessDelimiter(text));
  let headers: string[] = [];
  let headerRows = 0;
  const records: CsvRecord[] = [];

  for (const cells of rows) {
    if (headerScore(cells) >= 10) {
      headers = cells.map(normalizeKey);
      headerRows += 1;
      continue;
    }

    if (!headers.length || isRepeatedHeader(cells, headers)) continue;

    const record = headers.reduce<CsvRecord>((result, header, index) => {
      if (header) result[header] = cells[index] || "";
      return result;
    }, {});

    if (Object.values(record).some((value) => value.trim())) records.push(record);
  }

  return { records, headers, headerRows };
}

function field(record: CsvRecord, aliases: string[]) {
  for (const alias of aliases) {
    const value = record[normalizeKey(alias)];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numeric(value: string, fallback = 0) {
  if (!value) return fallback;
  const negativeByParentheses = /^\s*\(.*\)\s*$/.test(value);
  let normalized = value.replace(/[()\s$€£¥₩]/g, "");
  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");

  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  } else if (comma >= 0) {
    const decimals = normalized.length - comma - 1;
    normalized = decimals > 0 && decimals <= 4
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  }

  normalized = normalized.replace(/[^0-9.+-]/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return negativeByParentheses ? -Math.abs(parsed) : parsed;
}

function numericField(record: CsvRecord, aliases: string[]) {
  const raw = field(record, aliases);
  return { found: raw !== "", value: numeric(raw) };
}

function dateOnly(value: string) {
  const raw = value.trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sideFrom(record: CsvRecord, buyTime: string, sellTime: string): "Long" | "Short" {
  const explicit = field(record, ["side", "direction", "position side", "trade direction", "buy/sell"]);
  if (/short|sell/i.test(explicit)) return "Short";
  if (/long|buy/i.test(explicit)) return "Long";

  const boughtAt = timestamp(buyTime);
  const soldAt = timestamp(sellTime);
  if (boughtAt && soldAt) return boughtAt <= soldAt ? "Long" : "Short";
  return "Long";
}

function hashRecord(record: CsvRecord) {
  return crypto.createHash("sha1").update(JSON.stringify(record)).digest("hex").slice(0, 28);
}

function sumFees(record: CsvRecord) {
  const aliases = [
    "total fees",
    "fees",
    "commission",
    "commissions",
    "clearing fee",
    "exchange fee",
    "nfa fee",
    "brokerage fee",
  ];
  const used = new Set<string>();
  return aliases.reduce((total, alias) => {
    const key = normalizeKey(alias);
    if (used.has(key) || !(key in record)) return total;
    used.add(key);
    return total + Math.abs(numeric(record[key]));
  }, 0);
}

function externalIdFor(record: CsvRecord) {
  const pairId = field(record, ["pair id", "pairid", "fill pair id"]);
  if (pairId) return `pair:${pairId}`;

  const buyFillId = field(record, ["buy fill id", "buyfillid"]);
  const sellFillId = field(record, ["sell fill id", "sellfillid"]);
  if (buyFillId || sellFillId) return `fills:${buyFillId || "-"}:${sellFillId || "-"}`;

  const tradeId = field(record, ["trade id", "tradeid", "order id", "id"]);
  if (tradeId) return `trade:${tradeId}`;

  return `hash:${hashRecord(record)}`;
}

function isSummaryRow(record: CsvRecord, symbol: string) {
  const values = Object.values(record).slice(0, 8).join(" ");
  return !symbol
    || /^(total|summary|grandtotal|subtotal)$/i.test(symbol)
    || /\b(grand total|report total|monthly total|summary)\b/i.test(values);
}

export function parseTradovatePositionHistoryCsv(params: {
  text: string;
  userId: string;
  account: TradovateCsvAccount;
}) {
  const parsedCsv = parseCsv(params.text);
  const accountSize = numeric(String(params.account.account_size || 0));
  const profitTarget = numeric(String(params.account.profit_target || 0));
  const maxDrawdown = numeric(String(params.account.max_drawdown || 0));
  const seen = new Set<string>();
  let skipped = 0;
  let duplicateRows = 0;

  const rows = parsedCsv.records.flatMap<TradovateCsvJournalRow>((record) => {
    const symbol = field(record, SYMBOL_ALIASES)
      .replace(/^\/+/, "")
      .replace(/\s+/g, "")
      .toUpperCase();

    const quantityField = numericField(record, QUANTITY_ALIASES);
    const quantity = Math.abs(quantityField.value);
    const buyPrice = numeric(field(record, BUY_PRICE_ALIASES));
    const sellPrice = numeric(field(record, SELL_PRICE_ALIASES));
    const buyTime = field(record, ["bought timestamp", "buy timestamp", "bought time", "buy time"]);
    const sellTime = field(record, ["sold timestamp", "sell timestamp", "sold time", "sell time"]);
    const side = sideFrom(record, buyTime, sellTime);
    const directEntry = numericField(record, ENTRY_PRICE_ALIASES);
    const directExit = numericField(record, EXIT_PRICE_ALIASES);
    const entryPrice = directEntry.found ? directEntry.value : side === "Long" ? buyPrice : sellPrice;
    const exitPrice = directExit.found ? directExit.value : side === "Long" ? sellPrice : buyPrice;
    const pnl = numericField(record, PNL_ALIASES);
    const tradeDate = dateOnly(
      field(record, ["trade date"])
      || (side === "Long" ? sellTime : buyTime)
      || field(record, ["timestamp", "date"]),
    );

    if (
      isSummaryRow(record, symbol)
      || !quantityField.found
      || quantity <= 0
      || entryPrice <= 0
      || exitPrice <= 0
      || !pnl.found
      || !tradeDate
    ) {
      skipped += 1;
      return [];
    }

    const externalId = externalIdFor(record).slice(0, 160);
    if (seen.has(externalId)) {
      duplicateRows += 1;
      return [];
    }
    seen.add(externalId);

    return [{
      user_id: params.userId,
      prop_account_id: params.account.id,
      symbol,
      side,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      fees: Number(sumFees(record).toFixed(2)),
      pnl: Number(pnl.value.toFixed(2)),
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
      external_id: externalId,
    }];
  });

  return {
    rows,
    scanned: parsedCsv.records.length,
    skipped,
    duplicateRows,
    headerRows: parsedCsv.headerRows,
    detectedHeaders: parsedCsv.headers.filter(Boolean),
  };
}
