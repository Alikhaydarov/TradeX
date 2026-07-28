import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Could not find ${label}.`);
  }
  return source.replace(before, after);
}

function patchSidebar() {
  const path = "src/components/sidebar.tsx";
  let source = readFileSync(path, "utf8");

  source = replaceRequired(
    source,
    'import { useLanguage } from "@/lib/i18n";',
    'import { useLanguage, type Locale } from "@/lib/i18n";',
    "Sidebar i18n import",
  );
  source = replaceRequired(
    source,
    "  const { t, locale, setLocale } = useLanguage();",
    "  const { t, locale, setLocale, languageOptions } = useLanguage();",
    "Sidebar language context",
  );
  source = replaceRequired(
    source,
    '  const selectMobileLocale = (nextLocale: "en" | "es") => {',
    "  const selectMobileLocale = (nextLocale: Locale) => {",
    "mobile locale type",
  );

  const desktopBefore = `                <DropdownMenuItem
                  onClick={() => setLocale("en")}
                  className="flex items-center justify-between px-3 py-2.5"
                >
                  <span className="flex items-center gap-2">
                    <Globe size={14} /> English
                  </span>
                  {locale === "en" ? (
                    <span className="text-[10px] font-bold text-zinc-400">
                      Active
                    </span>
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocale("es")}
                  className="flex items-center justify-between px-3 py-2.5"
                >
                  <span className="flex items-center gap-2 pl-6">Spanish</span>
                  {locale === "es" ? (
                    <span className="text-[10px] font-bold text-zinc-400">
                      Active
                    </span>
                  ) : null}
                </DropdownMenuItem>`;
  const desktopAfter = `                {languageOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setLocale(option.value)}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2">
                      <Globe size={14} /> {option.label}
                    </span>
                    {locale === option.value ? (
                      <span className="text-[10px] font-bold text-zinc-400">
                        Active
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                ))}`;
  source = replaceRequired(
    source,
    desktopBefore,
    desktopAfter,
    "desktop language options",
  );

  const mobileBefore = `              {([
                ["en", "English"],
                ["es", "Spanish"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectMobileLocale(value)}
                  className={\`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition \${
                    locale === value
                      ? "border-white/20 bg-white text-black"
                      : "border-white/10 bg-black text-zinc-300 hover:bg-white/[.05]"
                  }\`}
                >
                  {locale === value ? <Check size={14} /> : null}
                  {label}
                </button>
              ))}`;
  const mobileAfter = `              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectMobileLocale(option.value)}
                  className={\`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition \${
                    locale === option.value
                      ? "border-white/20 bg-white text-black"
                      : "border-white/10 bg-black text-zinc-300 hover:bg-white/[.05]"
                  }\`}
                >
                  {locale === option.value ? <Check size={14} /> : null}
                  {option.label}
                </button>
              ))}`;
  source = replaceRequired(
    source,
    mobileBefore,
    mobileAfter,
    "mobile language options",
  );

  if (/setLocale\(["']es["']\)|["']es["']\s*\|/.test(source)) {
    throw new Error("Sidebar still contains the removed Spanish locale.");
  }
  writeFileSync(path, source);
}

function patchSettings() {
  const path = "src/components/user-settings-dialog.tsx";
  let source = readFileSync(path, "utf8");
  source = replaceRequired(
    source,
    "  const { locale, setLocale } = useLanguage();",
    "  const { locale, setLocale, languageOptions } = useLanguage();",
    "Settings language context",
  );
  source = replaceRequired(
    source,
    `                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>`,
    `                          <SelectContent>
                            {languageOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>`,
    "Settings language selector",
  );
  if (/value=["']es["']|Español/.test(source)) {
    throw new Error("Settings still contains the removed Spanish locale.");
  }
  writeFileSync(path, source);
}

patchSidebar();
patchSettings();

for (const path of [
  "tools/finalize-i18n-selectors.mjs",
]) {
  if (existsSync(path)) unlinkSync(path);
}
