import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const path = "src/features/community/components/community-sidebar.tsx";
const before = readFileSync(path, "utf8");
const after = before.replace(
  `  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);`,
  `  useEffect(() => {
    onCollapsedChange?.(collapsed);
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Ignore unavailable storage.
    }
  }, [collapsed, onCollapsedChange]);`,
);

if (after === before || !after.includes("window.localStorage.setItem(STORAGE_KEY")) {
  throw new Error("Community sidebar persistence fix was not applied.");
}

writeFileSync(path, after);

for (const file of [
  "tools/fix-community-sidebar-persistence.mjs",
  ".github/workflows/fix-community-sidebar-persistence.yml",
]) {
  if (existsSync(file)) unlinkSync(file);
}
