import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";

const payloadDir = ".i18n-payload";
const chunks = readdirSync(payloadDir)
  .filter((name) => /^\d+\.txt$/.test(name))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

if (chunks.length !== 11) {
  throw new Error(`Expected 11 i18n payload chunks, found ${chunks.length}.`);
}

const encoded = chunks
  .map((name) => readFileSync(join(payloadDir, name), "utf8").trim())
  .join("");
const decoded = gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
const files = JSON.parse(decoded);

if (!files || typeof files !== "object" || Array.isArray(files)) {
  throw new Error("Invalid i18n payload.");
}

for (const [path, content] of Object.entries(files)) {
  if (typeof content !== "string") {
    throw new Error(`Invalid content for ${path}.`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`wrote ${path}`);
}

rmSync(payloadDir, { recursive: true, force: true });
for (const path of [
  "tools/apply-full-i18n.mjs",
  ".github/workflows/apply-full-i18n.yml",
]) {
  if (existsSync(path)) unlinkSync(path);
}
