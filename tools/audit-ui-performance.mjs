import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

const files = walk(SRC);
const libraryPatterns = {
  mui: /from\s+["']@mui\//g,
  emotion: /from\s+["']@emotion\//g,
  radix: /from\s+["'](?:radix-ui|@radix-ui\/)/g,
  recharts: /from\s+["']recharts["']/g,
  lucide: /from\s+["']lucide-react["']/g,
  nextImage: /from\s+["']next\/image["']/g,
  nextDynamic: /from\s+["']next\/dynamic["']/g,
  tanstack: /from\s+["']@tanstack\//g,
};

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    sourceFiles: files.length,
    sourceLines: 0,
    clientFiles: 0,
    directImgTags: 0,
    suspenseUsages: 0,
    dynamicCalls: 0,
  },
  imports: Object.fromEntries(Object.keys(libraryPatterns).map((key) => [key, []])),
  largeFiles: [],
  clientFiles: [],
  directImgFiles: [],
  dynamicFiles: [],
};

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const path = relative(ROOT, file).replaceAll("\\", "/");
  const lines = content.split("\n").length;
  const isClient = /^\s*["']use client["'];/m.test(content);
  const directImgs = (content.match(/<img\b/g) || []).length;
  const suspense = (content.match(/<Suspense\b|\bSuspense\s*[,}]/g) || []).length;
  const dynamicCalls = (content.match(/\bdynamic\s*\(/g) || []).length;

  report.totals.sourceLines += lines;
  report.totals.directImgTags += directImgs;
  report.totals.suspenseUsages += suspense;
  report.totals.dynamicCalls += dynamicCalls;

  if (lines >= 300) report.largeFiles.push({ path, lines, bytes: statSync(file).size });
  if (isClient) {
    report.totals.clientFiles += 1;
    report.clientFiles.push({ path, lines });
  }
  if (directImgs) report.directImgFiles.push({ path, count: directImgs });
  if (dynamicCalls) report.dynamicFiles.push({ path, count: dynamicCalls });

  for (const [library, pattern] of Object.entries(libraryPatterns)) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) report.imports[library].push(path);
  }
}

report.largeFiles.sort((a, b) => b.lines - a.lines);
report.clientFiles.sort((a, b) => b.lines - a.lines);

writeFileSync(
  join(ROOT, "ui-performance-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log("UI performance audit");
console.log(`Source files: ${report.totals.sourceFiles}`);
console.log(`Client files: ${report.totals.clientFiles}`);
console.log(`Large files (>=300 lines): ${report.largeFiles.length}`);
console.log(`Direct <img> tags: ${report.totals.directImgTags}`);
for (const [library, paths] of Object.entries(report.imports)) {
  console.log(`${library}: ${paths.length}`);
}
console.log("Largest files:");
for (const item of report.largeFiles.slice(0, 20)) {
  console.log(`- ${item.lines} ${item.path}`);
}
