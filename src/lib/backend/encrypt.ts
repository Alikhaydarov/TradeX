import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const raw = process.env.TRADE_ENCRYPT_KEY ?? "";
  if (raw.length === 64) return Buffer.from(raw, "hex");
  // Fallback: derive 32-byte key from any secret (dev only)
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback-dev-key-32bytes-padding!!";
  return Buffer.from(fallback.slice(0, 32), "utf8");
}

export function encryptPassword(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptPassword(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid encrypted value");
  const key = getKey();
  const decipher = createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
  const dec = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
  return dec.toString("utf8");
}
