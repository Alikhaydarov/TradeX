import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

const feedPath = "src/components/feed/use-feed-data.ts";
let feedSource = readFileSync(feedPath, "utf8");
const brokenFeedError = "      setError,\n        nextError instanceof Error";
if (!feedSource.includes(brokenFeedError)) {
  throw new Error("Feed archive error boundary was not found.");
}
feedSource = feedSource.replace(
  brokenFeedError,
  "      setError(\n        nextError instanceof Error",
);
if (!feedSource.includes("setEctingId(")) {
  throw new Error("Feed acting-state typo was not found.");
}
feedSource = feedSource.replaceAll("setEctingId(", "setActingId(");
writeFileSync(feedPath, feedSource);

const path = "src/components/journal-v2.tsx";
let source = readFileSync(path, "utf8");

function replaceRequired(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) {
    throw new Error(`Journal migration boundary not found: ${label}`);
  }
  source = next;
}

source = source.replace("  BookOpen,\n", "");
source = source.replace("  CheckCircle2,\n", "");
source = source.replace("  Plus,\n", "");
source = source.replace("  Trash2,\n", "");
source = source.replace(
  'import { useCallback, useEffect, useMemo, useRef, useState } from "react";',
  'import { useCallback, useEffect, useMemo, useState } from "react";',
);
source = source.replace('import dynamic from "next/dynamic";\n', "");
source = source.replace('import { MediaImage } from "./media-image";\n', "");
source = source.replace('import { Input } from "./ui/input";\n', "");
source = source.replace('import { Checkbox } from "./ui/checkbox";\n', "");
source = source.replace('import { Textarea } from "./ui/textarea";\n', "");
source = source.replace(
  'import { TradingViewChart } from "./tradingview-chart";\n',
  "",
);
source = source.replace(
  /import \{\n  AlertDialog,[\s\S]*?\n\} from "\.\/ui\/alert-dialog";\n/,
  "",
);
source = source.replace(
  /import \{\n  DropdownMenu,[\s\S]*?\n\} from "\.\/ui\/dropdown-menu";\n/,
  "",
);
replaceRequired(
  'import { JournalTradeEditor } from "./journal/journal-trade-editor";',
  'import { JournalTradeEditor } from "./journal/journal-trade-editor";\nimport { JournalGallery } from "./journal/journal-gallery";\nimport { JournalFilters, type JournalTradeRange as TradeRange } from "./journal/journal-filters";\nimport {\n  journalEntryFromRow,\n  type JournalEntryRow,\n  useJournalData,\n} from "./journal/use-journal-data";',
  "journal imports",
);
source = source.replace(
  'import type { TradeRange } from "@/features/trades/components/trades-archive";\n',
  "",
);

replaceRequired(
  /type EntryRow = \{[\s\S]*?\n\};\ntype Summary =/,
  "type EntryRow = JournalEntryRow;\ntype Summary =",
  "entry row type",
);
replaceRequired(
  /type JournalCacheEntry = \{[\s\S]*?\n\};\n\nconst JOURNAL_CACHE_TTL_MS = 5_000;\nconst JOURNAL_REFRESH_MS = 30_000;\nconst journalCache = new Map<string, JournalCacheEntry>\(\);\n/,
  "",
  "journal cache",
);
replaceRequired(
  /const TradesArchive = dynamic\([\s\S]*?\n\);\nconst cash =/,
  "const cash =",
  "trades archive dynamic import",
);
replaceRequired(
  /const parseTradeImages = \(value\?: string \| null\) => \{[\s\S]*?\n\};\nconst entryFrom = \(e: EntryRow\): JournalEntry => \{[\s\S]*?\n\};\n/,
  "const entryFrom = journalEntryFromRow;\n",
  "journal row mapper",
);

for (const line of [
  '  const [entries, setEntries] = useState<JournalEntry[]>([]);\n',
  '  const [loading, setLoading] = useState(true);\n',
  '  const [error, setError] = useState<string | null>(null);\n',
  '  const requestVersion = useRef(0);\n',
]) {
  if (!source.includes(line)) {
    throw new Error(`Journal migration state line not found: ${line.trim()}`);
  }
  source = source.replace(line, "");
}

replaceRequired(
  "  }, [mode]);\n\n",
  "  }, [mode, router]);\n\n",
  "account query effect dependency",
);

const openComposerPattern =
  /  const openTradeComposer = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[activeAccountId, mode, router\]\);\n\n/;
const openComposerMatch = source.match(openComposerPattern);
if (!openComposerMatch) {
  throw new Error("Journal trade composer callback was not found.");
}
const openComposer = openComposerMatch[0].replace(
  "[activeAccountId, mode, router]",
  "[activeAccountId, mode, router, setError]",
);
source = source.replace(openComposerPattern, "");

replaceRequired(
  /  \/\/ Accounts are loaded once by ActiveAccountProvider[\s\S]*?  \}, \[loadEntries, user\]\);\n/,
  `  const requestAccountId = mode === "workspace" ? activeAccountId : null;
  const {
    entries,
    setEntries,
    loading,
    error,
    setError,
    invalidate,
    reload: reloadJournal,
  } = useJournalData({
    userId: user?.id ?? null,
    mode,
    accountId: requestAccountId,
    accountsLoading,
  });

${openComposer}`,
  "journal data lifecycle",
);

source = source.replaceAll(
  "journalCache.delete(journalCacheKey);",
  "invalidate();",
);
replaceRequired(
  /  const reloadJournal = useCallback\(async \(\) => \{\n    invalidate\(\);\n    await loadEntries\(true, true\);\n  \}, \[journalCacheKey, loadEntries\]\);\n/,
  "",
  "legacy reload callback",
);

replaceRequired("<TradesArchive\n", "<JournalFilters\n", "journal filters");

const biblePattern =
  /(<TabsContent value="bible">)\n[\s\S]*?(\n\s*<\/TabsContent>)/;
if (!biblePattern.test(source)) {
  throw new Error("Trading Bible component boundary was not found.");
}
source = source.replace(
  biblePattern,
  `$1
              <JournalGallery
                trades={bibleTrades}
                onOpenTrade={openTrade}
              />$2`,
);

for (const forbidden of [
  "const TradesArchive = dynamic",
  "journalCacheKey",
  "const loadEntries = useCallback",
  "<TradesArchive",
  "requestVersion",
  "JournalCacheEntry",
]) {
  if (source.includes(forbidden)) {
    throw new Error(`Journal migration left forbidden source: ${forbidden}`);
  }
}

writeFileSync(path, source);

const tradovatePath = "src/lib/server/tradovate-csv.ts";
let tradovateSource = readFileSync(tradovatePath, "utf8");
const unusedSecondNumber = "  const secondNumber = Number(second);\n";
if (!tradovateSource.includes(unusedSecondNumber)) {
  throw new Error("Tradovate unused number line was not found.");
}
tradovateSource = tradovateSource.replace(unusedSecondNumber, "");
writeFileSync(tradovatePath, tradovateSource);

for (const file of [
  "tools/apply-journal-completion.mjs",
  ".github/workflows/apply-journal-completion.yml",
]) {
  if (existsSync(file)) unlinkSync(file);
}
