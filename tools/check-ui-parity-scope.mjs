import { execFileSync } from "node:child_process";

if (process.env.ALLOW_UI_CHANGES === "1") {
  console.log("UI parity scope guard disabled for an intentional visual-change phase.");
  process.exit(0);
}

const protectedFiles = new Set([
  "src/components/account.tsx",
  "src/components/feed-v3.tsx",
  "src/components/journal.tsx",
  "src/components/journal-v2.tsx",
  "src/components/sidebar.tsx",
  "src/components/workspace-topbar.tsx",
  "src/components/pro-ai-coach-launcher.tsx",
  "src/app/auth-landing-v2.css",
  "src/app/onyx-overrides.css",
  "src/app/responsive-fixes.css",
  "src/app/quality-overrides.css",
  "src/app/workspace-design-system.css",
  "src/app/workspace-visual-refresh.css",
  "src/app/workspace-docked-shell.css",
  "src/app/community-ui-fixes.css",
]);

let changedFiles;
try {
  changedFiles = execFileSync(
    "git",
    ["diff", "--name-only", "origin/main...HEAD"],
    { encoding: "utf8" },
  )
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
} catch (error) {
  console.error("Could not compare the branch with origin/main.");
  throw error;
}

const violations = changedFiles.filter((file) => protectedFiles.has(file));

if (violations.length > 0) {
  console.error("UI parity guard failed. Protected legacy visual files changed:");
  for (const file of violations) console.error(`- ${file}`);
  console.error(
    "Move visual changes to a dedicated parity-verified phase or set ALLOW_UI_CHANGES=1 intentionally.",
  );
  process.exit(1);
}

console.log("UI parity guard passed: protected legacy visual files are unchanged.");
