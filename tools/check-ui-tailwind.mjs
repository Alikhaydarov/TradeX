import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const allowedCss = new Set([path.normalize("src/app/globals.css")]);
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (extensions.has(path.extname(entry.name))) files.push(absolute);
  }

  return files;
}

function relative(file) {
  return path.normalize(path.relative(root, file));
}

function lineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function report(file, content, pattern, message) {
  let match;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(content))) {
    failures.push(`${relative(file)}:${lineNumber(content, match.index)} ${message}`);
    if (!pattern.global) break;
  }
}

for (const file of await walk(sourceRoot)) {
  const rel = relative(file);
  const content = await readFile(file, "utf8");

  if (file.endsWith(".css") && !allowedCss.has(rel)) {
    failures.push(`${rel}:1 standalone CSS files are not allowed; use Tailwind utilities in the component`);
  }

  report(file, content, /!important/g, "contains !important");
  report(file, content, /@media\b/g, "contains a media query; use Tailwind breakpoints");
  report(
    file,
    content,
    /(?:import|require\()[^\n]*["'][^"']+\.css["']/g,
    "imports a CSS file outside the root Tailwind stylesheet",
  );
  report(
    file,
    content,
    /window\.history\.(?:pushState|replaceState)/g,
    "uses manual history routing; use next/navigation",
  );
  report(
    file,
    content,
    /dispatchEvent\(new Event\(["']popstate["']\)\)/g,
    "dispatches popstate manually; use next/navigation",
  );
}

if (failures.length) {
  console.error("UI Tailwind audit failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI Tailwind audit passed: only globals.css remains, with no !important, media-query, CSS-import, or manual-history hacks.");
