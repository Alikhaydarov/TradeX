import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

function patchJournal() {
  const path = "src/components/journal-v2.tsx";
  let source = readFileSync(path, "utf8");

  source = source.replace(
    'import dynamic from "next/dynamic";',
    'import dynamic from "next/dynamic";\nimport { useRouter } from "next/navigation";',
  );
  source = source.replace(
    '  const { user } = useAuth();',
    '  const { user } = useAuth();\n  const router = useRouter();',
  );
  source = source.replace(
    '  const { pnlMode, tradeSort, setTradeSort, formatPnl } =\n    useWorkspacePreferences();',
    '  const router = useRouter();\n  const { pnlMode, tradeSort, setTradeSort, formatPnl } =\n    useWorkspacePreferences();',
  );

  source = source
    .replace('window.history.replaceState(null, "", "/accounts");', 'router.replace("/accounts");')
    .replace(/window\.history\.pushState\(null, "", "\/accounts"\);\n\s*window\.dispatchEvent\(new Event\("popstate"\)\);/g, 'router.push("/accounts");')
    .replace(/window\.history\.pushState\(null, "", "\/dashboard"\);\n\s*window\.dispatchEvent\(new Event\("popstate"\)\);/g, 'router.push("/dashboard");')
    .replace('window.history.pushState(null, "", "/calendar");', 'router.push("/calendar");')
    .replace(/window\.history\.pushState\(null, "", `\/calendar\/\$\{next\.getFullYear\(\)\}\/\$\{next\.getMonth\(\) \+ 1\}`\);/g, 'router.push(`/calendar/${next.getFullYear()}/${next.getMonth() + 1}`);')
    .replace(/window\.history\.pushState\(null, "", `\/calendar\/\$\{today\.getFullYear\(\)\}\/\$\{today\.getMonth\(\) \+ 1\}`\);/g, 'router.push(`/calendar/${today.getFullYear()}/${today.getMonth() + 1}`);')
    .replace('window.history.pushState(null, "", `/trades/${trade.id}`);', 'router.push(`/trades/${trade.id}`);')
    .replace('window.history.pushState(null, "", "/trades");', 'router.push("/trades");');

  source = source.replace(
    '  }, [activeAccountId, mode]);',
    '  }, [activeAccountId, mode, router]);',
  );
  source = source.replace(
    '  const openTrade = useCallback((trade: JournalEntry) => {\n    setSelectedTrade(trade);\n    router.push(`/trades/${trade.id}`);\n  }, []);',
    '  const openTrade = useCallback((trade: JournalEntry) => {\n    setSelectedTrade(trade);\n    router.push(`/trades/${trade.id}`);\n  }, [router]);',
  );
  source = source.replace(
    '  const closeTrade = useCallback(() => {\n    setSelectedTrade(null);\n    if (window.location.pathname.startsWith("/trades/")) {\n      router.push("/trades");\n    }\n  }, []);',
    '  const closeTrade = useCallback(() => {\n    setSelectedTrade(null);\n    if (window.location.pathname.startsWith("/trades/")) {\n      router.push("/trades");\n    }\n  }, [router]);',
  );

  if (source.includes("window.history.pushState") || source.includes('new Event("popstate")')) {
    throw new Error("Journal still contains manual SPA navigation.");
  }

  writeFileSync(path, source);
}

function patchCalendar() {
  const path = "src/components/calendar-workspace-v3.tsx";
  let source = readFileSync(path, "utf8");

  source = source.replace(
    'import { useCallback, useEffect, useMemo, useState } from "react";',
    'import { useCallback, useEffect, useMemo, useState } from "react";\nimport { usePathname, useRouter } from "next/navigation";',
  );
  source = source.replace(
    /\nfunction navigate\(path: string\) \{\n  window\.history\.pushState\(null, "", path\);\n  window\.dispatchEvent\(new Event\("popstate"\)\);\n\}\n/,
    "\n",
  );
  source = source.replace(
    'export function CalendarWorkspaceV3() {\n  const { accounts, activeAccountId, loading: accountsLoading } = useActiveAccountStore();',
    'export function CalendarWorkspaceV3() {\n  const pathname = usePathname();\n  const router = useRouter();\n  const { accounts, activeAccountId, loading: accountsLoading } = useActiveAccountStore();',
  );
  source = source.replace(
    '  useEffect(() => {\n    const sync = () => {\n      setRoute(currentRoute());\n      setDayDialogOpen(false);\n    };\n    window.addEventListener("popstate", sync);\n    return () => window.removeEventListener("popstate", sync);\n  }, []);',
    '  useEffect(() => {\n    setRoute(currentRoute());\n    setDayDialogOpen(false);\n  }, [pathname]);',
  );
  source = source.replace(/navigate\(/g, "router.push(");

  if (source.includes("window.history.pushState") || source.includes('new Event("popstate")')) {
    throw new Error("Calendar still contains manual SPA navigation.");
  }

  writeFileSync(path, source);
}

patchJournal();
patchCalendar();

for (const path of [
  "tools/apply-app-router-navigation.mjs",
  ".github/workflows/apply-app-router-navigation.yml",
]) {
  try {
    unlinkSync(path);
  } catch {
    // Ignore a missing one-time file during retries.
  }
}
