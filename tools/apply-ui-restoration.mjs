import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

function addNavigateImport(content) {
  if (!content.includes("navigateApp(")) return content;
  if (content.includes('from "@/lib/app-navigation"')) return content;
  const statement = 'import { navigateApp } from "@/lib/app-navigation";\n';
  if (content.startsWith('"use client";\n')) {
    return content.replace('"use client";\n', `"use client";\n\n${statement}`);
  }
  return `${statement}${content}`;
}

function migrateHistory(content) {
  let next = content;
  const pair = (method, replace) => {
    const expression = new RegExp(
      `window\\.history\\.${method}\\(\\s*null\\s*,\\s*["']{2}\\s*,\\s*([\\s\\S]*?)\\s*\\);\\s*window\\.dispatchEvent\\(new Event\\(["']popstate["']\\)\\);`,
      "g",
    );
    next = next.replace(
      expression,
      (_match, target) =>
        replace
          ? `navigateApp(${target.trim()}, { replace: true });`
          : `navigateApp(${target.trim()});`,
    );
  };

  pair("pushState", false);
  pair("replaceState", true);

  next = next.replace(
    /window\.history\.pushState\(\s*null\s*,\s*["']{2}\s*,\s*([\s\S]*?)\s*\);/g,
    (_match, target) => `navigateApp(${target.trim()});`,
  );
  next = next.replace(
    /window\.history\.replaceState\(\s*null\s*,\s*["']{2}\s*,\s*([\s\S]*?)\s*\);/g,
    (_match, target) => `navigateApp(${target.trim()}, { replace: true });`,
  );
  next = next.replace(
    /\s*window\.dispatchEvent\(new Event\(["']popstate["']\)\);/g,
    "",
  );

  return addNavigateImport(next);
}

async function update(relativePath, transform) {
  const absolute = path.join(root, relativePath);
  const current = await readFile(absolute, "utf8");
  const next = transform(current);
  if (next !== current) await writeFile(absolute, next);
}

await mkdir(path.join(srcRoot, "lib"), { recursive: true });
await mkdir(path.join(srcRoot, "components"), { recursive: true });

await writeFile(
  path.join(srcRoot, "lib", "app-navigation.ts"),
  `export const APP_NAVIGATE_EVENT = "tradox:navigate";\n\nexport type AppNavigationOptions = {\n  replace?: boolean;\n  scroll?: boolean;\n};\n\nexport function navigateApp(path: string, options: AppNavigationOptions = {}) {\n  if (typeof window === "undefined") return;\n  window.dispatchEvent(\n    new CustomEvent(APP_NAVIGATE_EVENT, {\n      detail: { path, replace: Boolean(options.replace), scroll: options.scroll !== false },\n    }),\n  );\n}\n`,
);

await writeFile(
  path.join(srcRoot, "components", "app-navigation-bridge.tsx"),
  `"use client";\n\nimport { useRouter } from "next/navigation";\nimport { useEffect } from "react";\n\nimport { APP_NAVIGATE_EVENT, type AppNavigationOptions } from "@/lib/app-navigation";\n\ntype NavigationDetail = AppNavigationOptions & { path: string };\n\nexport function AppNavigationBridge() {\n  const router = useRouter();\n\n  useEffect(() => {\n    const navigate = (event: Event) => {\n      const detail = (event as CustomEvent<NavigationDetail>).detail;\n      if (!detail?.path) return;\n      const options = { scroll: detail.scroll !== false };\n      if (detail.replace) router.replace(detail.path, options);\n      else router.push(detail.path, options);\n    };\n\n    window.addEventListener(APP_NAVIGATE_EVENT, navigate);\n    return () => window.removeEventListener(APP_NAVIGATE_EVENT, navigate);\n  }, [router]);\n\n  return null;\n}\n`,
);

for (const file of await walk(srcRoot)) {
  if (file.endsWith("app-navigation.ts") || file.endsWith("app-navigation-bridge.tsx")) continue;
  const current = await readFile(file, "utf8");
  const next = migrateHistory(current);
  if (next !== current) await writeFile(file, next);
}

await update("src/app/layout.tsx", (content) => {
  let next = content;
  if (!next.includes('import { AppNavigationBridge } from "@/components/app-navigation-bridge";')) {
    next = next.replace(
      'import { AccountCardMenuBridge } from "@/components/account-card-menu-bridge";\n',
      'import { AccountCardMenuBridge } from "@/components/account-card-menu-bridge";\nimport { AppNavigationBridge } from "@/components/app-navigation-bridge";\n',
    );
  }
  if (!next.includes("<AppNavigationBridge />")) {
    next = next.replace(
      "            {children}\n            <AccountCardMenuBridge />",
      "            <AppNavigationBridge />\n            {children}\n            <AccountCardMenuBridge />",
    );
  }
  return next;
});

await update("src/features/trading-dashboard/components/dashboard-overview-polished.tsx", (content) =>
  content.replace('transform: "rotate(-90deg) !important",', 'transform: "rotate(-90deg)",'),
);

await update("src/components/journal/journal-accounts.tsx", (content) =>
  content.replace("max-w-[1680px]", "max-w-[1320px]"),
);

await update("src/components/profile/profile-page.tsx", (content) =>
  content.replaceAll("max-w-5xl", "max-w-3xl"),
);

await update("src/components/profile/profile-header.tsx", (content) => {
  let next = content;
  next = next.replace(
    'className="overflow-hidden rounded-2xl border border-white/8 bg-[#090909]"',
    'className="overflow-hidden border-b border-white/8 bg-[#090909] sm:rounded-lg sm:border"',
  );
  next = next.replace(
    'className="relative h-28 overflow-hidden bg-[linear-gradient(135deg,#101010,#222)] sm:h-44"',
    'className="relative h-20 overflow-hidden bg-[linear-gradient(135deg,#111111,#202020)] sm:h-28"',
  );
  next = next.replace('className="px-4 pb-5 sm:px-6"', 'className="px-4 pb-4 sm:px-5"');
  next = next.replace(
    'className="size-20 rounded-full border-4 border-[#090909] bg-black text-xl shadow-xl sm:size-28 sm:text-2xl"',
    'className="size-20 rounded-full border-4 border-[#090909] bg-black text-xl shadow-xl sm:size-24 sm:text-2xl"',
  );
  next = next.replace(
    'className="text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl"',
    'className="text-xl font-black tracking-[-0.025em] text-white sm:text-2xl"',
  );
  next = next.replace(
    'className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"',
    'className="mt-4 grid grid-cols-4 divide-x divide-white/8 overflow-hidden rounded-lg border border-white/8 bg-[#111111]"',
  );
  next = next.replace(
    'className="rounded-xl border border-white/8 bg-white/[.025] p-3"',
    'className="min-w-0 px-2 py-2.5 text-center"',
  );
  next = next.replace(
    'className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600"',
    'className="text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-600"',
  );
  next = next.replace(
    'className={`mt-2 font-mono text-base font-semibold ${',
    'className={`mt-0.5 truncate font-mono text-xs font-semibold ${',
  );
  return next;
});

await update("src/components/feed/feed-page.tsx", (content) =>
  content
    .replace("bg-black/92", "bg-[#111214]/96")
    .replace('className="text-lg font-semibold tracking-tight text-white"', 'className="text-lg font-black tracking-tight text-white"')
    .replace("Verified execution reviews from the community", "Shared trade reviews only"),
);

await update("src/components/feed/post-card.tsx", (content) => {
  let next = content;
  next = next.replace(
    'className="rounded-2xl border border-white/8 bg-[#090909] p-4 transition hover:border-white/12 sm:p-5"',
    'className="rounded-[1.25rem] border border-white/8 bg-[#17181b] px-3 py-4 transition-colors hover:bg-[#191a1e] sm:px-5 sm:py-5"',
  );
  next = next.replace("font-semibold tracking-tight hover:underline", "font-black tracking-tight hover:underline");
  next = next.replace("text-[11px] text-zinc-600", "text-[11px] text-slate-500");
  next = next.replace(
    'className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/[.02] px-3 py-2.5"',
    'className="mt-3 flex flex-wrap items-center gap-2 rounded-[1rem] border border-white/8 bg-black/14 px-3 py-2.5"',
  );
  next = next.replace('className="mr-auto bg-[#121212]"', 'className="mr-auto rounded-xl bg-white/[.03]"');
  next = next.replace("text-[15px] leading-6 text-zinc-200", "text-[15px] leading-6 text-slate-100");
  next = next.replace("bg-black/20", "bg-black/10");
  return next;
});

await rm(path.join(root, "tools", "apply-ui-restoration.mjs"));
