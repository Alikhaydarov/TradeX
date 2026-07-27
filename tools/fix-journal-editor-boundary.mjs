import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const path = "src/components/journal-v2.tsx";
let source = readFileSync(path, "utf8");
const broken = `            </div>\n pinner className="size-6" />\n        </div>\n      )}\n    </section>\n  );\n}\n\nfunction ProgressBar(`;
const repaired = `            </div>\n          </DialogContent>\n        </Dialog>\n      </div>\n    </div>\n  );\n}\n\nfunction ProgressBar(`;

if (!source.includes(broken)) {
  throw new Error("Broken journal editor boundary was not found.");
}

source = source.replace(broken, repaired);
writeFileSync(path, source);

for (const file of [
  "tools/fix-journal-editor-boundary.mjs",
  ".github/workflows/fix-journal-editor-boundary.yml",
]) {
  try {
    unlinkSync(file);
  } catch {
    // Ignore missing one-time files during retry.
  }
}
