import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";

const EXPECTED_LENGTH = 81596;
const EXPECTED_HASH = "a8adcc8f0e07ea65616241d2a92c9a9f46dd7fa110e053a2912acaf39447e224";
const payloadDir = ".i18n-payload";
const chunks = readdirSync(payloadDir)
  .filter((name) => /^\d+\.txt$/.test(name))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

if (chunks.length !== 11) {
  throw new Error(`Expected 11 i18n payload chunks, found ${chunks.length}.`);
}

const chunkDetails = chunks.map((name) => {
  const content = readFileSync(join(payloadDir, name), "utf8").trim();
  return {
    name,
    content,
    length: content.length,
    hash: createHash("sha256").update(content).digest("hex"),
  };
});
for (const chunk of chunkDetails) {
  console.log(`${chunk.name}: ${chunk.length} chars, sha256 ${chunk.hash}`);
}

const encoded = chunkDetails.map((chunk) => chunk.content).join("");
const payloadHash = createHash("sha256").update(encoded).digest("hex");
console.log(`i18n payload: ${encoded.length} base64 chars, sha256 ${payloadHash}`);
if (encoded.length !== EXPECTED_LENGTH || payloadHash !== EXPECTED_HASH) {
  throw new Error(
    `I18n payload integrity mismatch. Expected ${EXPECTED_LENGTH}/${EXPECTED_HASH}, received ${encoded.length}/${payloadHash}.`,
  );
}

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
  console.log(`wrote ${path} (${content.length} chars)`);
}

rmSync(payloadDir, { recursive: true, force: true });
for (const path of [
  "tools/apply-full-i18n.mjs",
  ".github/workflows/apply-full-i18n.yml",
]) {
  if (existsSync(path)) unlinkSync(path);
}
