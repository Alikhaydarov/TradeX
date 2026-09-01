#!/usr/bin/env node
/**
 * Runs the repo's unit tests.
 *
 * There is no test framework here, and pulling one in for a handful of pure
 * functions would be a large dependency for a small job. Node has shipped a
 * test runner since 18, so all this has to do is get the TypeScript into a
 * shape Node can load.
 *
 * Node's own type stripping is not enough by itself: it does not resolve the
 * `@/` alias, and it does not rewrite extensionless relative imports - which is
 * how every module in src/ is written. So the tests are compiled first, with a
 * throwaway tsconfig that extends the project's (inheriting `paths` and
 * `strict`) and only overrides what emitting requires.
 *
 * tsc follows the import graph from the test files, so only modules a test
 * actually reaches get compiled. That keeps this well away from anything
 * needing the Next.js runtime.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const ROOT = process.cwd();

function findTests(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findTests(full, found);
    else if (/\.test\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

const tests = findTests(join(ROOT, "src"));
if (!tests.length) {
  console.log("No test files found (looked for src/**/*.test.ts).");
  process.exit(0);
}

const outDir = mkdtempSync(join(tmpdir(), "tradoxy-tests-"));
const configPath = join(ROOT, "tsconfig.tests.tmp.json");

writeFileSync(
  configPath,
  JSON.stringify(
    {
      extends: "./tsconfig.json",
      compilerOptions: {
        noEmit: false,
        outDir,
        rootDir: ".",
        // CommonJS with classic node resolution, so the extensionless relative
        // imports used across src/ keep working once emitted.
        module: "commonjs",
        moduleResolution: "node",
        target: "es2022",
        incremental: false,
        isolatedModules: false,
      },
      include: tests.map((file) => relative(ROOT, file)),
    },
    null,
    2,
  ),
);

try {
  console.log(`Compiling ${tests.length} test file(s)...`);
  execFileSync("npx", ["tsc", "--project", configPath], { stdio: "inherit" });

  const compiled = tests.map((file) =>
    join(outDir, relative(ROOT, file).replace(/\.tsx?$/, ".js")),
  );
  execFileSync(process.execPath, ["--test", ...compiled], { stdio: "inherit" });
} finally {
  rmSync(configPath, { force: true });
  rmSync(outDir, { recursive: true, force: true });
}
