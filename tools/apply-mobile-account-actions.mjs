import fs from "node:fs";

const path = "src/components/sidebar.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Missing migration anchor: ${label}`);
  }
  source = source.replace(search, replacement);
}

replaceOnce(
  `  CircleHelp,\n  CalendarDays,\n  ChevronDown,`,
  `  CalendarDays,\n  Check,\n  ChevronDown,\n  CircleHelp,\n  CreditCard,`,
  "mobile action icons",
);

replaceOnce(
  `  LogIn,\n  MoreHorizontal,`,
  `  LogIn,\n  LogOut,\n  MoreHorizontal,`,
  "logout icon",
);

replaceOnce(
  `  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);\n  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);`,
  `  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);\n  const [mobileAccountActionsOpen, setMobileAccountActionsOpen] = useState(false);\n  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);`,
  "mobile account actions state",
);

replaceOnce(
  `  const openSettings = () => {\n    setMobileMenuOpen(false);\n    setSettingsOpen(true);\n  };\n\n  const openHelpCenter = () => {\n    window.open("/pricing", "_blank", "noopener,noreferrer");\n  };`,
  `  const openSettings = () => {\n    setMobileMenuOpen(false);\n    setSettingsOpen(true);\n  };\n\n  const openHelpCenter = () => {\n    window.open("/pricing", "_blank", "noopener,noreferrer");\n  };\n\n  const openMobileAccountActions = () => {\n    setMobileMenuOpen(false);\n    window.setTimeout(() => setMobileAccountActionsOpen(true), 160);\n  };\n\n  const runMobileAccountAction = (action: () => void) => {\n    setMobileAccountActionsOpen(false);\n    window.setTimeout(action, 160);\n  };\n\n  const openMobileSettings = () =>\n    runMobileAccountAction(() => setSettingsOpen(true));\n  const openMobilePricing = () => runMobileAccountAction(openPricing);\n  const openMobileHelp = () => runMobileAccountAction(openHelpCenter);\n  const openMobileLogout = () =>\n    runMobileAccountAction(() => setLogoutConfirmOpen(true));\n  const openMobileLogin = () => runMobileAccountAction(onLogin);\n  const selectMobileLocale = (nextLocale: "en" | "es") => {\n    setLocale(nextLocale);\n    setMobileAccountActionsOpen(false);\n  };`,
  "mobile account action handlers",
);

const mobileIconIndex = source.indexOf("<MoreHorizontal size={15} />");
if (mobileIconIndex === -1) {
  throw new Error("Missing mobile account menu icon");
}
const mobileDropdownStart = source.lastIndexOf(
  "                  <DropdownMenu>",
  mobileIconIndex,
);
const mobileDropdownEndToken = "                  </DropdownMenu>";
const mobileDropdownEnd =
  source.indexOf(mobileDropdownEndToken, mobileIconIndex) +
  mobileDropdownEndToken.length;
if (mobileDropdownStart === -1 || mobileDropdownEnd < mobileDropdownEndToken.length) {
  throw new Error("Unable to locate mobile account dropdown");
}

const mobileTrigger = `                  <button\n                    type="button"\n                    onClick={openMobileAccountActions}\n                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-[#090909] text-zinc-300 transition hover:bg-[#111111] hover:text-white active:scale-95"\n                    aria-label="Open account settings"\n                    aria-haspopup="dialog"\n                    aria-expanded={mobileAccountActionsOpen}\n                  >\n                    <MoreHorizontal size={18} />\n                  </button>`;

source =
  source.slice(0, mobileDropdownStart) +
  mobileTrigger +
  source.slice(mobileDropdownEnd);

const alertMarker = `      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>`;
if (!source.includes(alertMarker)) {
  throw new Error("Missing logout alert anchor");
}

const mobileSheet = `      <Sheet\n        open={mobileAccountActionsOpen}\n        onOpenChange={setMobileAccountActionsOpen}\n      >\n        <SheetContent\n          side="bottom"\n          showCloseButton={false}\n          aria-label="Account actions"\n          className="inset-x-2 bottom-2 h-auto max-h-[calc(100dvh-1rem)] w-auto overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#050505] px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-24px_80px_rgba(0,0,0,.78)] lg:hidden"\n        >\n          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />\n\n          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-3">\n            <TraderAvatar\n              name={name}\n              value={avatar}\n              className="size-11 shrink-0 text-xs"\n            />\n            <div className="min-w-0 flex-1">\n              <div className="flex min-w-0 items-center gap-2">\n                <strong className="truncate text-sm text-white">\n                  {visibleName}\n                </strong>\n                <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black text-emerald-300">\n                  {planLabel}\n                </span>\n              </div>\n              <p className="mt-0.5 truncate text-[11px] text-zinc-500">\n                {visibleHandle}\n              </p>\n            </div>\n            <button\n              type="button"\n              onClick={() => setMobileAccountActionsOpen(false)}\n              className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black text-zinc-400 transition hover:bg-white/5 hover:text-white"\n              aria-label="Close account actions"\n            >\n              <X size={17} />\n            </button>\n          </div>\n\n          <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#080808]">\n            <button\n              type="button"\n              onClick={openMobileSettings}\n              className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[.05] active:bg-white/[.08]"\n            >\n              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.055] text-zinc-200">\n                <Settings2 size={18} />\n              </span>\n              <span className="min-w-0 flex-1">\n                <strong className="block text-sm text-white">Settings</strong>\n                <small className="mt-0.5 block truncate text-[11px] text-zinc-500">\n                  Profile, security and workspace\n                </small>\n              </span>\n              <ChevronDown className="-rotate-90 text-zinc-600" size={17} />\n            </button>\n\n            <div className="mx-3 h-px bg-white/8" />\n\n            <button\n              type="button"\n              onClick={openMobilePricing}\n              className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[.05] active:bg-white/[.08]"\n            >\n              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.055] text-zinc-200">\n                <CreditCard size={18} />\n              </span>\n              <span className="min-w-0 flex-1">\n                <strong className="block text-sm text-white">\n                  {premium.isPremium ? "Manage subscription" : "View plans"}\n                </strong>\n                <small className="mt-0.5 block truncate text-[11px] text-zinc-500">\n                  Current plan: {planLabel}\n                </small>\n              </span>\n              <ChevronDown className="-rotate-90 text-zinc-600" size={17} />\n            </button>\n\n            <div className="mx-3 h-px bg-white/8" />\n\n            <button\n              type="button"\n              onClick={openMobileHelp}\n              className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[.05] active:bg-white/[.08]"\n            >\n              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.055] text-zinc-200">\n                <CircleHelp size={18} />\n              </span>\n              <span className="min-w-0 flex-1">\n                <strong className="block text-sm text-white">Help Center</strong>\n                <small className="mt-0.5 block truncate text-[11px] text-zinc-500">\n                  Support and platform information\n                </small>\n              </span>\n              <ChevronDown className="-rotate-90 text-zinc-600" size={17} />\n            </button>\n          </div>\n\n          <div className="mt-3 rounded-2xl border border-white/10 bg-[#080808] p-3">\n            <div className="flex items-center gap-3">\n              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.055] text-zinc-200">\n                <Globe size={18} />\n              </span>\n              <div className="min-w-0 flex-1">\n                <strong className="block text-sm text-white">Language</strong>\n                <small className="mt-0.5 block text-[11px] text-zinc-500">\n                  Choose the interface language\n                </small>\n              </div>\n            </div>\n            <div className="mt-3 grid grid-cols-2 gap-2">\n              {([\n                ["en", "English"],\n                ["es", "Spanish"],\n              ] as const).map(([value, label]) => (\n                <button\n                  key={value}\n                  type="button"\n                  onClick={() => selectMobileLocale(value)}\n                  className={\`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition \${\n                    locale === value\n                      ? "border-white/20 bg-white text-black"\n                      : "border-white/10 bg-black text-zinc-300 hover:bg-white/[.05]"\n                  }\`}\n                >\n                  {locale === value ? <Check size={14} /> : null}\n                  {label}\n                </button>\n              ))}\n            </div>\n          </div>\n\n          {user ? (\n            <button\n              type="button"\n              onClick={openMobileLogout}\n              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/15 bg-rose-400/[.07] px-4 text-sm font-bold text-rose-300 transition hover:bg-rose-400/[.12] active:scale-[.99]"\n            >\n              <LogOut size={17} /> Logout\n            </button>\n          ) : (\n            <button\n              type="button"\n              onClick={openMobileLogin}\n              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200 active:scale-[.99]"\n            >\n              <LogIn size={17} /> Sign in\n            </button>\n          )}\n\n          <button\n            type="button"\n            onClick={() => setMobileAccountActionsOpen(false)}\n            className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black px-4 text-sm font-bold text-zinc-300 transition hover:bg-white/[.05]"\n          >\n            Cancel\n          </button>\n        </SheetContent>\n      </Sheet>\n\n`;

source = source.replace(alertMarker, mobileSheet + alertMarker);
fs.writeFileSync(path, source);
