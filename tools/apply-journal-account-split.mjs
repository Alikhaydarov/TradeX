import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const journalPath = "src/components/journal-v2.tsx";
let source = readFileSync(journalPath, "utf8");

if (!source.includes('import { JournalAccountList } from "./journal/journal-account-list";')) {
  const anchor = 'import { DashboardOverview } from "@/features/trading-dashboard/components/dashboard-overview";';
  source = source.replace(
    anchor,
    `${anchor}\nimport { JournalAccountList } from "./journal/journal-account-list";`,
  );
}

source = source.replace(/^  MoreHorizontal,\n/m, "");
source = source.replace(/^  WalletCards,\n/m, "");
source = source.replace(/<Accounts\b/g, "<JournalAccountList");

const accountsStart = source.indexOf("function Accounts(");
const coachStart = source.indexOf("function AiCoachCard(");
if (accountsStart === -1 || coachStart === -1 || coachStart <= accountsStart) {
  throw new Error("Journal account component boundaries were not found.");
}

source = `${source.slice(0, accountsStart)}${source.slice(coachStart)}`;
writeFileSync(journalPath, source);

for (const path of [
  "tools/apply-journal-account-split.mjs",
  ".github/workflows/apply-journal-account-split.yml",
]) {
  try {
    unlinkSync(path);
  } catch {
    // The one-time file may already be absent during a retry.
  }
}
