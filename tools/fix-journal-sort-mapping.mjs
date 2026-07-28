import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const path = "tools/apply-journal-completion.mjs";
let source = readFileSync(path, "utf8");
const anchor = 'replaceRequired("<TradesArchive\\n", "<JournalFilters\\n", "journal filters");';
if (!source.includes(anchor)) {
  throw new Error("Journal filter mapping anchor was not found.");
}
const mapping = `${anchor}
source = source.replace(
  "                sort={tradeSort}",
  '                sort={tradeSort === "entryDate" ? "oldest" : "newest"}',
);
source = source.replace(
  "                onSortChange={setTradeSort}",
  '                onSortChange={(value) => setTradeSort(value === "oldest" ? "entryDate" : "exitDate")}',
);`;
source = source.replace(anchor, mapping);
writeFileSync(path, source);

if (existsSync("tools/fix-journal-sort-mapping.mjs")) {
  unlinkSync("tools/fix-journal-sort-mapping.mjs");
}
