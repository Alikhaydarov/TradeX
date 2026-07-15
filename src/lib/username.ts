import reservedUsernames from "reserved-usernames";

export const USERNAME_MAX_LENGTH = 24;

type UsernameValidation =
  | { valid: true; value: string; error: null }
  | { valid: false; value: string; error: string };

const PLATFORM_RESERVED_NAMES = [
  "admin",
  "administrator",
  "api",
  "auth",
  "billing",
  "help",
  "moderator",
  "official",
  "owner",
  "premium",
  "pricing",
  "root",
  "security",
  "staff",
  "stripe",
  "support",
  "supabase",
  "system",
  "team",
  "tradeway",
  "tradex",
  "verified",
] as const;

const reservedNameSet = new Set([
  ...reservedUsernames.map((name) => name.toLowerCase()),
  ...PLATFORM_RESERVED_NAMES,
]);

const protectedPrefixes = [
  "admin",
  "moderator",
  "official",
  "support",
  "system",
  "team",
  "tradeway",
  "tradex",
] as const;

export function normalizeUsername(input: string) {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(input: string): UsernameValidation {
  const value = normalizeUsername(input);

  if (!value) return { valid: false, value, error: "Username is required." };
  if (value.length < 3 || value.length > USERNAME_MAX_LENGTH) {
    return { valid: false, value, error: `Use 3-${USERNAME_MAX_LENGTH} characters.` };
  }
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    return { valid: false, value, error: "Start with a letter. Use lowercase letters, numbers, or underscores only." };
  }
  if (value.endsWith("_") || value.includes("__")) {
    return { valid: false, value, error: "Usernames cannot end with or repeat underscores." };
  }
  if (reservedNameSet.has(value) || protectedPrefixes.some((prefix) => value.startsWith(`${prefix}_`))) {
    return { valid: false, value, error: "This username is reserved by TradeWay." };
  }

  return { valid: true, value, error: null };
}
