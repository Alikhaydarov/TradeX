import assert from "node:assert/strict";
import { parsePlatformCsvToJournalRows } from "../src/lib/platform-csv.ts";

const account = { id: "account-1", name: "Test account", market_type: "Futures", account_size: 50000 };
const columns = "Symbol,Side,Quantity,Entry Price,Exit Price,Close Time,Net PNL,Trade ID";
const row = 'NQ,Buy,2,20100,20120,2026-01-15,400,trade-1';

for (const platform of ["tradovate", "ninjatrader", "projectx", "ctrader", "matchtrader"]) {
  const result = parsePlatformCsvToJournalRows({ platform, text: `${columns}\n${row}\n`, userId: "user-1", account });
  assert.equal(result.rows.length, 1, `${platform} should parse one closed trade`);
  assert.equal(result.rows[0].pnl, 400);
  assert.equal(result.rows[0].external_id, "trade-1");
  assert.equal(result.rows[0].side, "Long");
}

const malformed = parsePlatformCsvToJournalRows({ platform: "ninjatrader", text: `${columns}\nNQ,Buy,2,,,,,\n`, userId: "user-1", account });
assert.equal(malformed.rows.length, 0);
assert.equal(malformed.skipped, 1);
console.log("Platform CSV import: 6 cases passed");
