import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const path = "src/components/feed/use-feed-data.ts";
let source = readFileSync(path, "utf8");
if (!source.includes("setEctingId(editingPost.id);")) {
  throw new Error("Feed edit typo was not found.");
}
source = source.replace("setEctingId(editingPost.id);", "setActingId(editingPost.id);");
writeFileSync(path, source);

if (existsSync("tools/fix-feed-edit-typo.mjs")) {
  unlinkSync("tools/fix-feed-edit-typo.mjs");
}
