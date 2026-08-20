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

const SYMBOL_ALIASES = [
  "contract",
  "contract name",
  "contract description",
  "symbol",
  "product",
  "instrument",
];
const QUANTITY_ALIASES = [
  "quantity",
  "qty",
  "contracts",
  "size",
  "buy qty",
  "bought qty",
  "sell qty",
  "sold qty",
];
const ENTRY_PRICE_ALIASES = [
  "entry price",
  "open price",
  "opening price",
  "average entry price",
  "avg entry price",
];
const EXIT_PRICE_ALIASES = [
  "exit price",
  "close price",
  "closing price",
  "average exit price",
  "avg exit price",
];
const BUY_PRICE_ALIASES = ["buy price", "bought price", "average buy price", "avg buy price"];
const SELL_PRICE_ALIASES = ["sell price", "sold price", "average sell price", "avg sell price"];
const PNL_ALIASES = [
  "p/l",
  "pl",
  "pnl",
  "profit/loss",
  "profit loss",
  "profit and loss",
  "realized p/l",
  "realized pl",
  "realized pnl",
  "realized profit/loss",
  "net p/l",
  "net pl",
  "net pnl",
  "net profit",
  "gross p/l",
  "gross pl",
  "gross pnl",
  "closed p/l",
  "closed pl",
  "profit",
];
const DATE_TIME_ALIASES = [
  "bought timestamp",
  "sold timestamp",
  "buy timestamp",
  "sell timestamp",
  "entry time",
  "exit time",
  "open time",
  "close time",
  "opening time",
  "closing time",
  "trade date",
  "closed date",
  "date",
  "timestamp",
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
  if (hasAny(cells, QUANTITY_ALIASES)) score += 1;
  if (hasAny(cells, PNL_ALIASES)) score += 4;
  if (hasAny(cells, DATE_TIME_ALIASES)) score += 2;
  if (
    hasAny(cells, ENTRY_PRICE_ALIASES)
    || hasAny(cells, EXIT_PRICE_ALIASES)
    || hasAny(cells, BUY_PRICE_ALIASES)
    || hasAny(cells, SELL_PRICE_ALIASES)
  ) score += 2;
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
  const rows = parseCsvRows(text, delimiter).slice(0, 120);
  const bestHeader = rows.reduce((best, row) => Math.max(best, headerScore(row)), 0);
  const usefulRows = rows.filter((row) => row.length >= 5).length;
  const widestRow = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
  return bestHeader * 100 + Math.min(usefulRows, 30) * 2 + Math.min(widestRow, 40);
}

function guessDelimiter(text: string) {
  const candidates = [",", ";", "\t"];
  return candidates.reduce((best, candidate) => (
    delimiterScore(text, candidate) > delimiterScore(text, best) ? candidate : best
  ), candidates[0]);
}

function isRepeatedHeader(cells: string[], headers: string[]) {
  if (!headers.length) return false;
  const normalizedCells = cells.map(normalizeKey);
  const matches = normalizedCells.reduce((count, value, index) => (
    value && value === headers[index] ? count + 1 : count
  ), 0);
  return matches >= Math.min(3, headers.filter(Boolean).length);
}

function parseCsv(text: string): ParsedCsv {
  const rows = parseCsvRows(text, guessDelimiter(text));
  if (rows.length < 2) return { records: [], headers: [], headerRows: 0 };

  let headers: string[] = [];
  let headerRows = 0;
  const records: CsvRecord[] = [];

  for (const cells of rows) {
    const score = headerScore(cells);
    if (score >= 8) {
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
    if (value !== undefined && value.trim() !== "") return value.trim();
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

  const excelSerial = Number(raw);
  if (Number.isFinite(excelSerial) && excelSerial > 20_000 && excelSerial < 100_000) {
    return new Date(Date.UTC(1899, 11, 30) + excelSerial * 86_400_000).toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const normalized = raw.replace(/\./g, "-").replace(/\//g, "-");
  const match = normalized.match(/(\d{1,4})-(\d{1,2})-(\d{1,4})/);
  if (!match) return "";

  const [, first, second, third] = match;
  if (first.length === 4) {
    return `${first}-${second.padStart(2, "0")}-${third.padStart(2, "0")}`;
  }

  const year = third.length === 2 ? `20${third}` : third;
  const firstNumber = Number(first);
  const month = firstNumber > 12 ? second : first;
  const day = firstNumber > 12 ? first : second;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function combinedDateTime(record: CsvRecord, options: {
  timestampAliases: string[];
  dateAliases: string[];
  timeAliases: string[];
}) {
  const timestampValue = field(record, options.timestampAliases);
  if (timestampValue) return timestampValue;
  const dateValue = field(record, options.dateAliases);
  const timeValue = field(record, options.timeAliases);
  return [dateValue, timeValue].filter(Boolean).join(" ");
}

function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sideFrom(record: CsvRecord, buyTime: string, sellTime: string): "Long" | "Short" {
  const raw = field(record, ["side", "direction", "position side", "trade direction", "buy/sell", "b/s", "action"]);
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

function isSummaryRow(record: CsvRecord, symbol: string) {
  const firstValues = Object.values(record).slice(0, 6).join(" ").trim();
  return !symbol
    || /^(total|summary|grandtotal|subtotal)$/i.test(symbol)
    || /\b(grand total|report total|monthly total|summary)\b/i.test(firstValues);
}

export function parseTradovateCsvToJournalRows(params: {
  text: string;
  userId: string;
  account: TradovateCsvAccount;
}) {
  const parsedCsv = parseCsv(params.text);
  const records = parsedCsv.records;
  const accountSize = numeric(String(params.account.account_size || 0));
  const profitTarget = numeric(String(params.account.profit_target || 0));
  const maxDrawdown = numeric(String(params.account.max_drawdown || 0));
  let skipped = 0;

  const rows = records.flatMap<TradovateCsvJournalRow>((record) => {
    const symbol = field(record, SYMBOL_ALIASES)
      .replace(/^\/+/, "")
      .replace(/\s+/g, "")
      .toUpperCase();

    const quantityField = numericField(record, ["quantity", "qty", "contracts", "size"]);
    const boughtQuantity = Math.abs(numeric(field(record, ["buy qty", "bought qty", "buy quantity", "bought quantity"])));
    const soldQuantity = Math.abs(numeric(field(record, ["sell qty", "sold qty", "sell quantity", "sold quantity"])));
    const quantity = Math.abs(quantityField.found ? quantityField.value : Math.max(boughtQuantity, soldQuantity, 1));

    const buyTime = combinedDateTime(record, {
      timestampAliases: ["bought timestamp", "buy timestamp", "bought time", "buy time"],
      dateAliases: ["bought date", "buy date", "entry date", "open date"],
      timeAliases: ["bought time", "buy time", "entry time", "open time"],
    });
    const sellTime = combinedDateTime(record, {
      timestampAliases: ["sold timestamp", "sell timestamp", "sold time", "sell time"],
      dateAliases: ["sold date", "sell date", "exit date", "close date", "closed date"],
      timeAliases: ["sold time", "sell time", "exit time", "close time", "closing time"],
    });
    const side = sideFrom(record, buyTime, sellTime);

    const directEntry = numericField(record, ENTRY_PRICE_ALIASES);
    const directExit = numericField(record, EXIT_PRICE_ALIASES);
    const buyPrice = numeric(field(record, BUY_PRICE_ALIASES));
    const sellPrice = numeric(field(record, SELL_PRICE_ALIASES));
    const entryPrice = directEntry.found ? directEntry.value : side === "Long" ? buyPrice : sellPrice;
    const exitPrice = directExit.found ? directExit.value : side === "Long" ? sellPrice : buyPrice;

    const entryTime = combinedDateTime(record, {
      timestampAliases: ["entry timestamp", "open timestamp", "entry time", "open time", "opening time"],
      dateAliases: ["entry date", "open date", "opening date"],
      timeAliases: ["entry time", "open time", "opening time"],
    }) || (side === "Long" ? buyTime : sellTime);
    const exitTime = combinedDateTime(record, {
      timestampAliases: ["exit timestamp", "close timestamp", "exit time", "close time", "closing time", "timestamp"],
      dateAliases: ["exit date", "close date", "closing date", "closed date", "trade date", "date"],
      timeAliases: ["exit time", "close time", "closing time"],
    }) || (side === "Long" ? sellTime : buyTime);
    const tradeDate = dateOnly(exitTime || entryTime || field(record, ["trade date", "date"]));
    const pnlField = numericField(record, PNL_ALIASES);

    if (
      isSummaryRow(record, symbol)
      || !tradeDate
      || !quantity
      || !pnlField.found
      || entryPrice <= 0
      || exitPrice <= 0
    ) {
      skipped += 1;
      return [];
    }

    const externalId = field(record, [
      "position id",
      "positionid",
      "trade id",
      "tradeid",
      "buy fill id",
      "sell fill id",
      "order id",
      "id",
    ]) || hashRecord(record);

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
      external_id: String(externalId).slice(0, 160),
    }];
  });

  return {
    rows,
    scanned: records.length,
    skipped,
    headerRows: parsedCsv.headerRows,
    detectedHeaders: parsedCsv.headers.filter(Boolean),
  };
}
