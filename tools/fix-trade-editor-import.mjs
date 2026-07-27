import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const path = "src/components/journal/journal-trade-editor.tsx";
let source = readFileSync(path, "utf8");
source = source.replace(
  'import { useRef, useState } from "react";',
  'import { useEffect, useRef, useState } from "react";',
);
writeFileSync(path, source);

for (const file of [
  "tools/fix-trade-editor-import.mjs",
  ".github/workflows/fix-trade-editor-import.yml",
]) {
  try {
    unlinkSync(file);
  } catch {
    // Ignore missing one-time files on retry.
  }
}
