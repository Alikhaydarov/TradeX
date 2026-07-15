import fs from "node:fs";
import path from "node:path";

const required = [
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STANDARD_MONTHLY",
  "STRIPE_PRICE_PRO_MONTHLY",
];

const cwd = process.cwd();
const envLocalPath = path.join(cwd, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }
}

loadEnvFile(envLocalPath);

const missing = required.filter((key) => !process.env[key]);

console.log("Tradox billing environment check");
console.log("");

for (const key of required) {
  const present = Boolean(process.env[key]);
  console.log(`${present ? "OK   " : "MISS "} ${key}`);
}

console.log("");

if (missing.length > 0) {
  console.log("Missing values:");
  for (const key of missing) {
    console.log(`- ${key}`);
  }
  process.exitCode = 1;
} else {
  console.log("Billing environment is ready.");
}
