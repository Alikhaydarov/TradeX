import { decryptSecret, encryptSecret } from "./crypto";

export function encryptPassword(plaintext: string): string {
  return encryptSecret(plaintext);
}

export function decryptPassword(encrypted: string): string {
  return decryptSecret(encrypted);
}
