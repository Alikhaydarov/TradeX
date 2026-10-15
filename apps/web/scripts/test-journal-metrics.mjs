import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(__dirname, "../src/lib/journal-metrics.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });
const { summarizeTrades } = moduleExports;
const mixed = summarizeTrades([
  { pnl: 200, result_r: 2 },
  { pnl: -100, result_r: -1 },
  { pnl: 0, result_r: 0 },
  { pnl: null, result_r: null },
]);
assert.equal(mixed.closed, 3);
assert.equal(mixed.wins, 1);
assert.equal(mixed.losses, 1);
assert.equal(mixed.breakeven, 1);
assert.equal(mixed.pnl, 100);
assert.ok(Math.abs(mixed.winRate - 100 / 3) < 1e-9);
assert.equal(mixed.expectancy, 100 / 3);
assert.equal(mixed.profitFactor, 2);
assert.equal(mixed.averageR, 1 / 3);
const empty = summarizeTrades([]);
assert.equal(empty.winRate, 0);
assert.equal(empty.expectancy, 0);
assert.equal(empty.profitFactor, 0);
assert.equal(
  summarizeTrades([{ pnl: 100, result_r: null }]).profitFactor,
  Infinity,
);
assert.equal(summarizeTrades([{ pnl: 100, result_r: null }]).averageR, 0);
console.log(
  "Journal metrics: breakeven, unknown outcomes, expectancy and profit factor passed.",
);
