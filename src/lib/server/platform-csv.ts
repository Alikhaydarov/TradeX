import crypto from "node:crypto";

export type CsvImportPlatform = "ninjatrader" | "matchtrader" | "projectx";

export type PlatformCsvAccount = {
  id: string;
  name: string;
  market_type?: string | null;
  account_size?: string | number | null;
  profit_target?: string | number | null;
  max_drawdown?: string | number | null;
};

export type PlatformCsvJournalRow = {
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
  external_source: "ninjatrader_csv" | "matchtrader_csv" | "projectx_csv";
  external_id: string;
};

type CsvRecord = Record<string, string>;

type PlatformDefinition = {
  label: string;
  marketType: string;
  source: PlatformCsvJournalRow["external_source"];
  symbolKeys: string[];
  sideKeys: string[];
  quantityKeys: string[];
  signedQuantityKeys: string[];
  entryKeys: string[];
  exitKeys: string[];
  closeTimeKeys: string[];
  pnlKeys: string[];
  feeKeys: string[];
  idKeys: string[];
};

const COMMON = {
  symbolKeys: ["symbol", "instrument", "market", "contract", "contract id", "symbol id"],
  sideKeys: ["side", "direction", "type", "market position", "market pos", "position type", "action"],
  quantityKeys: ["quantity", "qty", "volume", "size", "contracts", "filled quantity"],
  signedQuantityKeys: ["position size", "net position", "signed quantity"],
  entryKeys: ["entry price", "open price", "opening price", "average entry price", "avg entry price", "entry"],
  exitKeys: ["exit price", "close price", "closing price", "average exit price", "avg exit price", "exit"],
  closeTimeKeys: ["exit time", "exit date", "close time", "close date", "closing time", "closed at", "trade day", "created at", "timestamp", "date"],
  pnlKeys: ["profit and loss", "profit/loss", "net profit", "gross profit", "net pnl", "realized pnl", "profit", "pnl"],
  feeKeys: ["fees", "fee", "commission", "commissions", "swap", "swap fee"],
  idKeys: ["trade id", "trade number", "trade #", "position id", "position", "ticket", "order id", "execution id", "id"],
};

const DEFINITIONS: Record<CsvImportPlatform, PlatformDefinition> = {
  ninjatrader: {
    label: "NinjaTrader",
    marketType: "Futures",
    source: "ninjatrader_csv",
    symbolKeys: ["instrument", ...COMMON.symbolKeys],
    sideKeys: ["market position", "market pos", ...COMMON.sideKeys],
    quantityKeys: ["quantity", ...COMMON.quantityKeys],
    signedQuantityKeys: COMMON.signedQuantityKeys,
    entryKeys: ["entry price", ...COMMON.entryKeys],
    exitKeys: ["exit price", ...COMMON.exitKeys],
    closeTimeKeys: ["exit time", ...COMMON.closeTimeKeys],
    pnlKeys: ["profit", "profit currency", ...COMMON.pnlKeys],
    feeKeys: COMMON.feeKeys,
    idKeys: ["trade number", "trade #", ...COMMON.idKeys],
  },
  matchtrader: {
    label: "MatchTrader",
    marketType: "CFD",
    source: "matchtrader_csv",
    symbolKeys: ["symbol", "instrument", ...COMMON.symbolKeys],
    sideKeys: ["side", "type", ...COMMON.sideKeys],
    quantityKeys: ["volume", "size", ...COMMON.quantityKeys],
    signedQuantityKeys: COMMON.signedQuantityKeys,
    entryKeys: ["open price", ...COMMON.entryKeys],
    exitKeys: ["close price", ...COMMON.exitKeys],
    closeTimeKeys: ["close time", "closing time", ...COMMON.closeTimeKeys],
    pnlKeys: ["profit", "net profit", ...COMMON.pnlKeys],
    feeKeys: COMMON.feeKeys,
    idKeys: ["position id", "position", "ticket", ...COMMON.idKeys],
  },
  projectx: {
    label: "Project X",
    marketType: "Futures",
    source: "projectx_csv",
    symbolKeys: ["symbol id", "contract id", "symbol", ...COMMON.symbolKeys],
    sideKeys: ["side", "position type", ...COMMON.sideKeys],
    quantityKeys: ["size", "quantity", ...COMMON.quantityKeys],
    signedQuantityKeys: ["position size", ...COMMON.signedQuantityKeys],
    entryKeys: ["entry price", ...COMMON.entryKeys],
    exitKeys: ["exit price", ...COMMON.exitKeys],
    closeTimeKeys: ["trade day", "created at", ...COMMON.closeTimeKeys],
    pnlKeys: ["profit and loss", "profitandloss", ...COMMON.pnlKeys],
    feeKeys: COMMON.feeKeys,
    idKeys: ["id", "trade id", ...COMMON.idKeys],
  },
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function uniqueKeys(keys: string[]) {
  return [...new Set(keys.map(normalizeKey))];
}

function guessDelimiter(text: string) {
  const sample = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.trim()) || "";
  return [",", ";", "\t"].sort((left, right) => sample.split(right).length - sample.split(left).length)[0];
}

function parseCsvRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function parseCsv(text: string): CsvRecord[] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = parseCsvRows(clean, guessDelimiter(clean));
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeKey);
  return rows.slice(1).map((cells) => headers.reduce<CsvRecord>((record, header, index) => {
    if (header) record[header] = cells[index] || "";
    return record;
  }, {}));
}

function first(record: CsvRecord, keys: string[]) {
  for (const key of uniqueKeys(keys)) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseNumber(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const negative = /^\(.*\)$/.test(raw);
  let normalized = raw.replace(/[()\s$€£¥₩%]/g, "");
  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");

  if (comma >= 0 && dot >= 0) {
    if (comma > dot) normalized = normalized.replace(/\./g, "").replace(",", ".");
    else normalized = normalized.replace(/,/g, "");
  } else if (comma >= 0) {
    const decimals = normalized.length - comma - 1;
    normalized = decimals > 0 && decimals <= 4
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  }

  normalized = normalized.replace(/[^0-9.+-]/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

function firstNumber(record: CsvRecord, keys: string[]) {
  for (const key of uniqueKeys(keys)) {
    const raw = record[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const value = parseNumber(raw);
    if (value !== null) return { found: true, value };
  }
  return { found: false, value: 0 };
}

function sumNumbers(record: CsvRecord, keys: string[]) {
  return uniqueKeys(keys).reduce((total, key) => {
    const raw = record[key];
    const value = typeof raw === "string" ? parseNumber(raw) : null;
    return total + Math.abs(value || 0);
  }, 0);
}

function parseDate(value: string) {
  if (!value.trim()) return "";
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 20_000 && numeric < 100_000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + numeric * 86_400_000).toISOString().slice(0, 10);
  }

  const parsed = new Date(value.replace(/\./g, "/"));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const match = value.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (!match) return "";
  const firstPart = Number(match[1]);
  const secondPart = Number(match[2]);
  const year = match[3].length === 2 ? Number(`20${match[3]}`) : Number(match[3]);
  const month = firstPart > 12 ? secondPart : firstPart;
  const day = firstPart > 12 ? firstPart : secondPart;
  const fallback = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(fallback.getTime()) ? "" : fallback.toISOString().slice(0, 10);
}

function hashRecord(platform: CsvImportPlatform, record: CsvRecord) {
  return crypto.createHash("sha1").update(`${platform}:${JSON.stringify(record)}`).digest("hex").slice(0, 28);
}

function cleanSymbol(value: string) {
  return value.trim().replace(/^\/+/, "").replace(/\s+/g, "").toUpperCase();
}

function isSummaryRow(record: CsvRecord, symbol: string) {
  const joined = Object.values(record).slice(0, 5).join(" ");
  return !symbol || /^(total|summary|grandtotal)$/i.test(symbol) || /\b(grand total|summary row)\b/i.test(joined);
}

function sideFrom(params: {
  platform: CsvImportPlatform;
  explicit: string;
  signedQuantity: number | null;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
}): "Long" | "Short" {
  const value = params.explicit.trim().toLowerCase();
  if (params.platform === "projectx") {
    if (value === "0" || value === "bid") return "Long";
    if (value === "1" || value === "ask") return "Short";
  }
  if (/sell|short|ask/.test(value)) return "Short";
  if (/buy|long|bid/.test(value)) return "Long";
  if (params.signedQuantity !== null && params.signedQuantity !== 0) {
    return params.signedQuantity < 0 ? "Short" : "Long";
  }
  if (params.pnl >= 0) return params.exitPrice >= params.entryPrice ? "Long" : "Short";
  return params.exitPrice < params.entryPrice ? "Long" : "Short";
}

export function parsePlatformCsvToJournalRows(params: {
  platform: CsvImportPlatform;
  text: string;
  userId: string;
  account: PlatformCsvAccount;
}) {
  const definition = DEFINITIONS[params.platform];
  const records = parseCsv(params.text);
  const accountSize = parseNumber(String(params.account.account_size || "")) || 0;
  const profitTarget = parseNumber(String(params.account.profit_target || "")) || 0;
  const maxDrawdown = parseNumber(String(params.account.max_drawdown || "")) || 0;
  let skipped = 0;

  const rows = records.flatMap<PlatformCsvJournalRow>((record) => {
    const symbol = cleanSymbol(first(record, definition.symbolKeys));
    const entry = firstNumber(record, definition.entryKeys);
    const exit = firstNumber(record, definition.exitKeys);
    const pnl = firstNumber(record, definition.pnlKeys);
    const quantityField = firstNumber(record, definition.quantityKeys);
    const signedQuantityField = firstNumber(record, definition.signedQuantityKeys);
    const closeTime = first(record, definition.closeTimeKeys);
    const tradedAt = parseDate(closeTime);

    if (
      isSummaryRow(record, symbol)
      || !entry.found
      || !exit.found
      || !pnl.found
      || entry.value <= 0
      || exit.value <= 0
      || !tradedAt
    ) {
      skipped += 1;
      return [];
    }

    const rawQuantity = signedQuantityField.found ? signedQuantityField.value : quantityField.value;
    const quantity = Math.abs(rawQuantity || 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      skipped += 1;
      return [];
    }

    const fees = sumNumbers(record, definition.feeKeys);
    const externalId = first(record, definition.idKeys) || hashRecord(params.platform, record);
    const side = sideFrom({
      platform: params.platform,
      explicit: first(record, definition.sideKeys),
      signedQuantity: signedQuantityField.found ? signedQuantityField.value : null,
      entryPrice: entry.value,
      exitPrice: exit.value,
      pnl: pnl.value,
    });

    return [{
      user_id: params.userId,
      prop_account_id: params.account.id,
      symbol,
      side,
      entry_price: entry.value,
      exit_price: exit.value,
      quantity,
      fees: Number(fees.toFixed(2)),
      pnl: Number(pnl.value.toFixed(2)),
      note: `Imported from ${definition.label} CSV`,
      traded_at: tradedAt,
      account_name: params.account.name,
      market_type: params.account.market_type || definition.marketType,
      setup: `${definition.label} import`,
      risk_amount: 0,
      result_r: 0,
      account_size: accountSize,
      profit_target: profitTarget,
      max_drawdown: maxDrawdown,
      external_source: definition.source,
      external_id: String(externalId).slice(0, 160),
    }];
  });

  return { rows, scanned: records.length, skipped };
}
