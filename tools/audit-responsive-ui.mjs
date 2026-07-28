import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

const rules = [
  { id: "fixed-width", pattern: /(?:^|\s)(?:w|min-w|max-w)-\[(?:2\d\d|[3-9]\d\d|\d{4,})px\]/g, weight: 3 },
  { id: "fixed-height", pattern: /(?:^|\s)(?:h|min-h|max-h)-\[(?:5\d\d|[6-9]\d\d|\d{4,})px\]/g, weight: 2 },
  { id: "screen-width", pattern: /(?:^|\s)w-screen(?:\s|$)/g, weight: 2 },
  { id: "full-viewport", pattern: /(?:^|\s)h-\[(?:100dvh|100vh)\](?:\s|$)/g, weight: 2 },
  { id: "overflow-hidden", pattern: /(?:^|\s)overflow-hidden(?:\s|$)/g, weight: 1 },
  { id: "nowrap", pattern: /(?:^|\s)whitespace-nowrap(?:\s|$)/g, weight: 1 },
  { id: "unscoped-grid", pattern: /(?:^|\s)grid-cols-(?:2|3|4|5|6|7|8|9|10|11|12)(?:\s|$)/g, weight: 2 },
  { id: "fixed-position", pattern: /(?:^|\s)fixed(?:\s|$)/g, weight: 1 },
];

const report = {
  generatedAt: new Date().toISOString(),
  totals: { files: 0, findings: 0, highRiskFiles: 0 },
  files: [],
};

for (const file of walk(SRC)) {
  const content = readFileSync(file, "utf8");
  const path = relative(ROOT, file).replaceAll("\\", "/");
  const lines = content.split("\n");
  const findings = [];

  lines.forEach((line, index) => {
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      const matches = [...line.matchAll(rule.pattern)].map((match) => match[0].trim());
      for (const value of matches) {
        findings.push({ rule: rule.id, weight: rule.weight, line: index + 1, value, source: line.trim().slice(0, 240) });
      }
    }
  });

  if (!findings.length) continue;
  const score = findings.reduce((total, item) => total + item.weight, 0);
  report.files.push({ path, bytes: statSync(file).size, score, findings });
  report.totals.findings += findings.length;
  if (score >= 10) report.totals.highRiskFiles += 1;
}

report.files.sort((a, b) => b.score - a.score || b.findings.length - a.findings.length);
report.totals.files = report.files.length;

writeFileSync("responsive-ui-audit.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(`Responsive files: ${report.totals.files}`);
console.log(`Findings: ${report.totals.findings}`);
console.log(`High-risk files: ${report.totals.highRiskFiles}`);
for (const item of report.files.slice(0, 30)) {
  console.log(`${item.score}\t${item.findings.length}\t${item.path}`);
}
