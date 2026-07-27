import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

function patchCommunity() {
  const path = "src/features/community/components/community-experience.tsx";
  let source = readFileSync(path, "utf8");

  source = source.replace(
    'import { useCallback, useEffect, useMemo, useState } from "react";',
    'import { useCallback, useEffect, useMemo, useState } from "react";\nimport { useRouter } from "next/navigation";',
  );
  source = source.replace('const MUTED = "text-[11px] text-zinc-500";\n\n', "");
  source = source.replace(
    /function go\(path: string\) \{\n  window\.history\.pushState\(null, "", path\);\n  window\.dispatchEvent\(new Event\("popstate"\)\);\n\}\n\n/,
    "",
  );
  source = source.replace(
    'export function CommunityHub() {\n  const [data, setData]',
    'export function CommunityHub() {\n  const router = useRouter();\n  const [data, setData]',
  );
  source = source.replace(
    'export function CommunityDetail({\n  communityId,\n  activeTab,\n}: {\n  communityId: string;\n  activeTab: CommunitySection;\n}) {\n  const [data, setData]',
    'export function CommunityDetail({\n  communityId,\n  activeTab,\n}: {\n  communityId: string;\n  activeTab: CommunitySection;\n}) {\n  const router = useRouter();\n  const [data, setData]',
  );
  source = source.replace(/\bgo\(/g, "router.push(");

  if (source.includes("window.history.pushState") || source.includes('new Event("popstate")')) {
    throw new Error("Community still contains manual SPA navigation.");
  }
  writeFileSync(path, source);
}

function patchProfile() {
  const editPath = "src/components/profile/profile-edit-dialog.tsx";
  let edit = readFileSync(editPath, "utf8");
  edit = edit.replace("  bannerInputRef,\n", "");
  edit = edit.replace("  bannerInputRef: RefObject<HTMLInputElement | null>;\n", "");
  writeFileSync(editPath, edit);

  const pagePath = "src/components/profile/profile-page.tsx";
  let page = readFileSync(pagePath, "utf8");
  page = page.replace("        bannerInputRef={controller.bannerInputRef}\n", "");
  writeFileSync(pagePath, page);
}

function patchTradeDetail() {
  const path = "src/features/trades/components/trade-detail-page.tsx";
  let source = readFileSync(path, "utf8");
  source = source.replace("  TrendingDown,\n", "");
  source = source.replace("  TrendingUp,\n", "");
  writeFileSync(path, source);
}

function patchTradovate() {
  const path = "src/components/tradovate-csv-settings.tsx";
  let source = readFileSync(path, "utf8");
  source = source.replace(/^\s*const secondNumber = .*;\n/m, "");
  writeFileSync(path, source);
}

patchCommunity();
patchProfile();
patchTradeDetail();
patchTradovate();

for (const path of [
  "tools/apply-final-lint-cleanup.mjs",
  ".github/workflows/apply-final-lint-cleanup.yml",
]) {
  try {
    unlinkSync(path);
  } catch {
    // Ignore missing one-time files on retry.
  }
}
