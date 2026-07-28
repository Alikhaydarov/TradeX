import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "uz", "ru", "ko"];
const catalogs = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(`src/locales/${locale}.json`, "utf8")),
  ]),
);

const semanticKeys = Object.keys(catalogs.en)
  .filter((key) => key !== "_legacy")
  .sort();
const legacyKeys = Object.keys(catalogs.en._legacy ?? {}).sort();
const failures = [];

for (const locale of LOCALES) {
  const catalog = catalogs[locale];
  const currentSemantic = Object.keys(catalog)
    .filter((key) => key !== "_legacy")
    .sort();
  const currentLegacy = Object.keys(catalog._legacy ?? {}).sort();

  const missingSemantic = semanticKeys.filter(
    (key) => !Object.hasOwn(catalog, key) || !String(catalog[key]).trim(),
  );
  const extraSemantic = currentSemantic.filter(
    (key) => !semanticKeys.includes(key),
  );
  const missingLegacy = legacyKeys.filter(
    (key) =>
      !Object.hasOwn(catalog._legacy ?? {}, key) ||
      !String(catalog._legacy?.[key] ?? "").trim(),
  );
  const extraLegacy = currentLegacy.filter((key) => !legacyKeys.includes(key));

  if (missingSemantic.length) {
    failures.push(`${locale}: missing semantic keys: ${missingSemantic.join(", ")}`);
  }
  if (extraSemantic.length) {
    failures.push(`${locale}: extra semantic keys: ${extraSemantic.join(", ")}`);
  }
  if (missingLegacy.length) {
    failures.push(
      `${locale}: missing ${missingLegacy.length} legacy phrases, first: ${missingLegacy
        .slice(0, 20)
        .join(" | ")}`,
    );
  }
  if (extraLegacy.length) {
    failures.push(
      `${locale}: extra ${extraLegacy.length} legacy phrases, first: ${extraLegacy
        .slice(0, 20)
        .join(" | ")}`,
    );
  }
}

const audit = JSON.parse(readFileSync("i18n-audit.json", "utf8"));
const uncovered = audit.phrases
  .map((entry) => entry.text)
  .filter((text) => !Object.hasOwn(catalogs.en._legacy ?? {}, text));
if (uncovered.length) {
  failures.push(
    `Untranslated source phrases (${uncovered.length}), first: ${uncovered
      .slice(0, 40)
      .join(" | ")}`,
  );
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const localeFiles = walk("src").filter((path) => /\.(ts|tsx|json)$/.test(path));
const forbidden = [];
for (const path of localeFiles) {
  if (path.includes("src/locales/")) continue;
  const source = readFileSync(path, "utf8");
  const patterns = [
    /setLocale\(\s*["']es["']\s*\)/g,
    /value\s*=\s*["']es["']/g,
    /["']Español["']/g,
    /["']Spanish["']/g,
    /["']en["']\s*\|\s*["']es["']/g,
  ];
  for (const pattern of patterns) {
    if (pattern.test(source)) forbidden.push(`${path}: ${pattern}`);
  }
}
if (forbidden.length) {
  failures.push(`Removed Spanish locale still referenced:\n${forbidden.join("\n")}`);
}

if (failures.length) {
  console.error("i18n coverage failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `i18n coverage passed: ${semanticKeys.length} semantic keys and ${legacyKeys.length} UI phrases across ${LOCALES.join(", ")}.`,
);
