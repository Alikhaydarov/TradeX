import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createMt5Token() {
  return `tw_mt5_${randomBytes(32).toString("base64url")}`;
}

export function hashMt5Token(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, hash: string) {
  const actual = Buffer.from(hashMt5Token(token), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

