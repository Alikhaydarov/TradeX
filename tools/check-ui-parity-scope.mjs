import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

if (process.env.ALLOW_UI_CHANGES === "1") {
  console.log("UI parity scope guard disabled for an intentional visual-change phase.");
  process.exit(0);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const sourceFiles = walk("src");
const sourceCssFiles = sourceFiles
  .filter((file) => extname(file) === ".css")
  .map((file) => relative(".", file).replaceAll("\\", "/"))
  .sort();
const allowedCssFiles = ["src/app/globals.css"];

if (JSON.stringify(sourceCssFiles) !== JSON.stringify(allowedCssFiles)) {
  console.error("Tailwind-only guard failed. Runtime CSS files are:");
  for (const file of sourceCssFiles) console.error(`- ${file}`);
  console.error(`Expected only: ${allowedCssFiles.join(", ")}`);
  process.exit(1);
}

const sourceModules = sourceFiles.filter((file) =>
  [".ts", ".tsx", ".js", ".jsx"].includes(extname(file)),
);
const cssImportPattern = /import\s+["'][^"']+\.css["'];?/g;
const cssImports = sourceModules.flatMap((file) => {
  const content = readFileSync(file, "utf8");
  return [...content.matchAll(cssImportPattern)].map((match) => ({
    file: relative(".", file).replaceAll("\\", "/"),
    statement: match[0],
  }));
});

const validImports = cssImports.filter(
  ({ file, statement }) =>
    file === "src/app/layout.tsx" && statement === 'import "./globals.css";',
);

if (cssImports.length !== 1 || validImports.length !== 1) {
  console.error("Tailwind-only guard failed. Runtime CSS imports are:");
  for (const item of cssImports) {
    console.error(`- ${item.file}: ${item.statement}`);
  }
  process.exit(1);
}

console.log(
  "UI parity guard passed: runtime UI ownership is Tailwind-only and globals.css is limited to Tailwind engine/tokens.",
);
