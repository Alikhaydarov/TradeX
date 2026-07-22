import crypto from "node:crypto";

export type CTraderImportAccount = {
  id: string;
  name: string;
  market_type?: string | null;
  account_size?: string | number | null;
  profit_target?: string | number | null;
  max_drawdown?: string | number | null;
};

export type CTraderJournalRow = {
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
  external_source: "ctrader_csv";
  external_id: string;
};

type CsvRecord = Record<string, string>;

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function guessDelimiter(text: string) {
  const sample = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const options = [",", ";", "\t"];
  return options.sort((left, right) => sample.split(right).length - sample.split(left).length)[0];
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function parseCsv(text: string): CsvRecord[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const delimiter = guessDelimiter(text);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeKey);

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter);
    return headers.reduce<CsvRecord>((record, header, index) => {
      record[header] = cells[index] || "";
      return record;
    }, {});
  });
}

function first(record: CsvRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[normalizeKey(key)];
    if (value) return value;
  }
  return "";
}

function number(value: string, fallback = 0) {
  if (!value) return fallback;
  const normalized = value
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateOnly(value: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const normalized = value.replace(/\./g, "-").replace(/\//g, "-");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const match = normalized.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (!match) return new Date().toISOString().slice(0, 10);
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function hashRecord(record: CsvRecord) {
  return crypto.createHash("sha1").update(JSON.stringify(record)).digest("hex").slice(0, 24);
}

function sideFrom(value: string): "Long" | "Short" {
  return /sell|short/i.test(value) ? "Short" : "Long";
}

export function parseCTraderCsvToJournalRows(params: {
  text: string;
  userId: string;
  account: CTraderImportAccount;
}) {
  const records = parseCsv(params.text);
  const accountSize = number(String(params.account.account_size || 0));
  const profitTarget = number(String(params.account.profit_target || 0));
  const maxDrawdown = number(String(params.account.max_drawdown || 0));

  return records.flatMap<CTraderJournalRow>((record) => {
    const symbol = first(record, ["symbol", "market", "instrument"]).replace(/\s/g, "").toUpperCase();
    const side = sideFrom(first(record, ["direction", "side", "trade type", "type"]));
    const closeTime = first(record, ["closing time", "close time", "closed time", "exit time", "time"]);
    const positionId = first(record, ["position id", "position", "positionid"]);
    const dealId = first(record, ["deal id", "deal", "order id", "order", "id"]);

    if (!symbol || !closeTime) return [];

    const entryPrice = number(first(record, ["entry price", "open price", "opening price", "price"]));
    const exitPrice = number(first(record, ["closing price", "close price", "exit price"]), entryPrice);
    const quantity = number(first(record, ["volume", "lots", "quantity", "amount"]), 1);
    const commission = number(first(record, ["commission", "commissions"]));
    const swap = number(first(record, ["swap", "swap fee"]));
    const pnl = number(first(record, ["net profit", "net pnl", "profit", "gross profit", "pnl"]));
    const externalId = positionId || dealId || hashRecord(record);

    return [{
      user_id: params.userId,
      prop_account_id: params.account.id,
      symbol,
      side,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      fees: Math.abs(commission + swap),
      pnl: Number(pnl.toFixed(2)),
      note: "Imported from cTrader CSV",
      traded_at: dateOnly(closeTime),
      account_name: params.account.name,
      market_type: params.account.market_type || "CFD",
      setup: "cTrader import",
      risk_amount: 0,
      result_r: 0,
      account_size: accountSize,
      profit_target: profitTarget,
      max_drawdown: maxDrawdown,
      external_source: "ctrader_csv",
      external_id: String(externalId),
    }];
  });
}
