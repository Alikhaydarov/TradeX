import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const USER_TEXT_PROPS = new Set([
  "placeholder",
  "title",
  "aria-label",
  "aria-description",
  "alt",
  "label",
  "description",
  "emptyMessage",
]);
const IGNORE_PATH_PARTS = [
  "/api/",
  "/lib/",
  "/types/",
  "/generated/",
  "/__tests__/",
];
const IGNORE_TEXT = new Set([
  "use client",
  "use server",
  "GET",
  "POST",
  "PATCH",
  "PUT",
  "DELETE",
  "USD",
  "UTC",
  "MT5",
  "CSV",
  "API",
  "AI",
  "Tradox",
]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return [path];
  });
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function isUserFacing(text) {
  const value = normalize(text);
  if (!value || value.length < 2 || IGNORE_TEXT.has(value)) return false;
  if (!/[A-Za-zÀ-ÿА-Яа-яЁё가-힣ʻʼ’]/.test(value)) return false;
  if (/^(https?:|\/|#|[a-z0-9_.-]+\.(com|io|app))/.test(value)) return false;
  if (/^[A-Z0-9_./:-]+$/.test(value) && !value.includes(" ")) return false;
  if (/^(bg|text|border|grid|flex|rounded|hover|focus|data|aria)-/.test(value)) return false;
  return true;
}

const findings = [];
const files = walk(SRC).filter((path) => {
  const normalized = path.replaceAll("\\", "/");
  return [".ts", ".tsx"].includes(extname(path)) &&
    !IGNORE_PATH_PARTS.some((part) => normalized.includes(part));
});

for (const path of files) {
  const source = readFileSync(path, "utf8");
  const sf = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function add(node, text, kind) {
    const value = normalize(text);
    if (!isUserFacing(value)) return;
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({
      file: relative(ROOT, path).replaceAll("\\", "/"),
      line: line + 1,
      column: character + 1,
      kind,
      text: value,
    });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      add(node, node.getText(sf), "jsx-text");
    }

    if (ts.isJsxAttribute(node)) {
      const prop = node.name.getText(sf);
      if (USER_TEXT_PROPS.has(prop) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          add(node.initializer, node.initializer.text, `prop:${prop}`);
        } else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isStringLiteralLike(node.initializer.expression)
        ) {
          add(node.initializer.expression, node.initializer.expression.text, `prop:${prop}`);
        }
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["alert", "confirm", "prompt"].includes(node.expression.text)
    ) {
      const first = node.arguments[0];
      if (first && ts.isStringLiteralLike(first)) add(first, first.text, `call:${node.expression.text}`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
}

const grouped = new Map();
for (const finding of findings) {
  const group = grouped.get(finding.text) ?? { text: finding.text, count: 0, locations: [] };
  group.count += 1;
  group.locations.push({
    file: finding.file,
    line: finding.line,
    column: finding.column,
    kind: finding.kind,
  });
  grouped.set(finding.text, group);
}

const phrases = [...grouped.values()].sort(
  (a, b) => b.count - a.count || a.text.localeCompare(b.text),
);
const report = {
  generatedAt: new Date().toISOString(),
  scannedFiles: files.length,
  occurrenceCount: findings.length,
  uniquePhraseCount: phrases.length,
  phrases,
};

writeFileSync("i18n-audit.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(`Scanned ${report.scannedFiles} source files.`);
console.log(`Found ${report.occurrenceCount} user-facing occurrences across ${report.uniquePhraseCount} unique phrases.`);
console.log("Top files:");
const byFile = new Map();
for (const finding of findings) byFile.set(finding.file, (byFile.get(finding.file) ?? 0) + 1);
for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`${String(count).padStart(4)}  ${file}`);
}
