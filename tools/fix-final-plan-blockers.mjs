import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const feedPath = "src/components/feed/use-feed-data.ts";
let feed = readFileSync(feedPath, "utf8");
const feedPattern = /    \} catch \(nextError\) \{\n      setError,\n\s*nextError instanceof Error\n\s*\? nextError\.message\n\s*: "Post could not be deleted\. Only the author or admin can delete it\.",\n\s*\);/;
if (!feedPattern.test(feed)) {
  throw new Error("Feed parser blocker was not found.");
}
feed = feed.replace(
  feedPattern,
  `    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Post could not be deleted. Only the author or admin can delete it.",
      );`,
);
writeFileSync(feedPath, feed);

const journalScriptPath = "tools/apply-journal-completion.mjs";
let journalScript = readFileSync(journalScriptPath, "utf8");

if (!journalScript.includes('"trade composer callback"')) {
  const stateLoopPattern = /for \(const line of \[\n  '  const \[entries, setEntries\] = useState<JournalEntry\[\]>\(\[\]\);\\n',\n  '  const \[loading, setLoading\] = useState\(true\);\\n',\n  '  const \[error, setError\] = useState<string \| null>\(null\);\\n',\n  '  const requestVersion = useRef\(0\);\\n',\n\]\) \{/;
  if (!stateLoopPattern.test(journalScript)) {
    throw new Error("Journal state migration boundary was not found.");
  }
  journalScript = journalScript.replace(
    stateLoopPattern,
    `replaceRequired(
  /  const openTradeComposer = useCallback\\(\\(\\) => \\{[\\s\\S]*?  \\}, \\[activeAccountId, mode, router\\]\\);\\n\\n/,
  "",
  "trade composer callback",
);

for (const line of [
  '  const [entries, setEntries] = useState<JournalEntry[]>([]);\\n',
  '  const [loading, setLoading] = useState(true);\\n',
  '  const [error, setError] = useState<string | null>(null);\\n',
  '  const requestVersion = useRef(0);\\n',
]) {`,
  );
}

if (!journalScript.includes("const openTradeComposer = useCallback(() =>")) {
  const hookPattern = /  \} = useJournalData\(\{\n    userId: user\?\.id \?\? null,\n    mode,\n    accountId: requestAccountId,\n    accountsLoading,\n  \}\);/;
  if (!hookPattern.test(journalScript)) {
    throw new Error("Journal hook insertion boundary was not found.");
  }
  journalScript = journalScript.replace(
    hookPattern,
    `  } = useJournalData({
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
  }, [activeAccountId, mode, router, setError]);`,
  );
}

journalScript = journalScript.replace('  }, [mode]);', '  }, [mode, router]);');
writeFileSync(journalScriptPath, journalScript);

for (const file of [
  "tools/fix-final-plan-blockers.mjs",
  ".github/workflows/fix-final-plan-blockers.yml",
]) {
  if (existsSync(file)) unlinkSync(file);
}
