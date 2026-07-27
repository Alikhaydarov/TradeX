import { execFileSync } from "node:child_process";

if (process.env.ALLOW_UI_CHANGES === "1") {
  console.log("UI parity scope guard disabled for an intentional visual-change phase.");
  process.exit(0);
}

const protectedLegacyComponents = new Set([
  "src/components/account.tsx",
  "src/components/feed-v3.tsx",
  "src/components/journal.tsx",
  "src/components/journal-v2.tsx",
  "src/components/sidebar.tsx",
  "src/components/workspace-topbar.tsx",
  "src/components/pro-ai-coach-launcher.tsx",
]);

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

let changedFiles;
try {
  changedFiles = runGit(["diff", "--name-only", "origin/main...HEAD"])
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
} catch (error) {
  console.error("Could not compare the branch with origin/main.");
  throw error;
}

const protectedViolations = changedFiles.filter((file) =>
  protectedLegacyComponents.has(file),
);

if (protectedViolations.length > 0) {
  console.error("UI parity guard failed. Protected legacy component markup changed:");
  for (const file of protectedViolations) console.error(`- ${file}`);
  process.exit(1);
}

const sourceFiles = runGit(["ls-files", "src"])
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);
const sourceCssFiles = sourceFiles.filter((file) => file.endsWith(".css"));
const unexpectedCssFiles = sourceCssFiles.filter(
  (file) => file !== "src/app/globals.css",
);

if (unexpectedCssFiles.length > 0) {
  console.error("Tailwind-only guard failed. Runtime source CSS files remain:");
  for (const file of unexpectedCssFiles) console.error(`- ${file}`);
  process.exit(1);
}

let cssImports = "";
try {
  cssImports = runGit(["grep", "-n", "-E", "import .*\\.css", "--", "src"]);
} catch {
  cssImports = "";
}

const importLines = cssImports
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
const allowedGlobalImport = 'src/app/layout.tsx:import "./globals.css";';
const unexpectedImports = importLines.filter(
  (line) => !line.endsWith(allowedGlobalImport.replace("src/app/layout.tsx:", "")) || !line.startsWith("src/app/layout.tsx:"),
);

if (unexpectedImports.length > 0) {
  console.error("Tailwind-only guard failed. Unexpected CSS imports remain:");
  for (const line of unexpectedImports) console.error(`- ${line}`);
  process.exit(1);
}

console.log(
  "UI parity guard passed: legacy markup is protected and runtime UI ownership is Tailwind-only.",
);
