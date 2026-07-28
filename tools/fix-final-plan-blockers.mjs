import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const feedPath = "src/components/feed/use-feed-data.ts";
let feed = readFileSync(feedPath, "utf8");
const brokenFeed = `    } catch (nextError) {
      setError,
        nextError instanceof Error
        ? nextError.message
        : "Post could not be deleted. Only the author or admin can delete it.",
      );
`;
const fixedFeed = `    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Post could not be deleted. Only the author or admin can delete it.",
      );
`;
if (!feed.includes(brokenFeed)) {
  throw new Error("Feed parser blocker was not found.");
}
feed = feed.replace(brokenFeed, fixedFeed);
writeFileSync(feedPath, feed);

const journalScriptPath = "tools/apply-journal-completion.mjs";
let journalScript = readFileSync(journalScriptPath, "utf8");

const stateLoop = `for (const line of [
  '  const [entries, setEntries] = useState<JournalEntry[]>([]);\\n',
  '  const [loading, setLoading] = useState(true);\\n',
  '  const [error, setError] = useState<string | null>(null);\\n',
  '  const requestVersion = useRef(0);\\n',
]) {`;

const stateLoopWithComposer = `replaceRequired(
  /  const openTradeComposer = useCallback\\(\\(\\) => \\{[\\s\\S]*?  \\}, \\[activeAccountId, mode, router\\]\\);\\n\\n/,
  "",
  "trade composer callback",
);

for (const line of [
  '  const [entries, setEntries] = useState<JournalEntry[]>([]);\\n',
  '  const [loading, setLoading] = useState(true);\\n',
  '  const [error, setError] = useState<string | null>(null);\\n',
  '  const requestVersion = useRef(0);\\n',
]) {`;

if (!journalScript.includes(stateLoop)) {
  throw new Error("Journal state migration boundary was not found.");
}
journalScript = journalScript.replace(stateLoop, stateLoopWithComposer);

const hookTail = `  } = useJournalData({
    userId: user?.id ?? null,
    mode,
    accountId: requestAccountId,
    accountsLoading,
  });
 `;
const hookTailWithComposer = `  } = useJournalData({
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
 `;
if (!journalScript.includes(hookTail)) {
  throw new Error("Journal hook insertion boundary was not found.");
}
journalScript = journalScript.replace(hookTail, hookTailWithComposer);

journalScript = journalScript.replace(
  '  }, [mode]);',
  '  }, [mode, router]);',
);
writeFileSync(journalScriptPath, journalScript);

for (const file of [
  "tools/fix-final-plan-blockers.mjs",
  ".github/workflows/fix-final-plan-blockers.yml",
]) {
  if (existsSync(file)) unlinkSync(file);
}
