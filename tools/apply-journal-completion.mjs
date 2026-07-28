import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

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
source = source.replace(
  'import { useCallback, useEffect, useMemo, useRef, useState } from "react";',
  'import { useCallback, useEffect, useMemo, useState } from "react";',
);
source = source.replace('import dynamic from "next/dynamic";\n', "");
source = source.replace('import { MediaImage } from "./media-image";\n', "");
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

replaceRequired(
  /  const openTradeComposer = useCallback\(\(\) => \{[\s\S]*?  \}, \[activeAccountId, mode, router\]\);\n\n/,
  "",
  "trade composer callback",
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

  const openTradeComposer = useCallback(() => {
    if (mode === "workspace" && !activeAccountId) {
      setError("Select an account before adding a trade.");
      router.push("/accounts");
      return;
    }
    setTradeOpen(true);
  }, [activeAccountId, mode, router, setError]);
 `,
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

for (const file of [
  "tools/apply-journal-completion.mjs",
  ".github/workflows/apply-journal-completion.yml",
]) {
  if (existsSync(file)) unlinkSync(file);
}
