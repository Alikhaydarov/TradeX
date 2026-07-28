import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

function update(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No changes applied to ${path}`);
  writeFileSync(path, after);
}

update("src/app/layout.tsx", (source) => {
  let next = source.replace(
    'import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";\n',
    "",
  );
  next = next
    .split("\n")
    .filter((line) => !line.includes("[&_.Mui"))
    .join("\n");
  next = next.replace(
    /\s*<AppRouterCacheProvider options=\{\{ enableCssLayer: true \}\}>\s*(<AuthProvider[\s\S]*?<\/AuthProvider>)\s*<\/AppRouterCacheProvider>/,
    "\n        $1",
  );
  if (next.includes("AppRouterCacheProvider") || next.includes("[&_.Mui")) {
    throw new Error("Root MUI provider cleanup was incomplete.");
  }
  return next;
});

update("src/components/user-settings-dialog.tsx", (source) => {
  let next = source.replace(/^import .*@mui\/material.*\n/gm, "");
  next = next.replace(
    'import { Dialog as SmallDialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";',
    'import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";',
  );
  next = next.replace(
    'import { Separator } from "./ui/separator";',
    'import { Separator } from "./ui/separator";\nimport { Switch } from "./ui/switch";',
  );
  next = next.replace('import { MaterialProvider } from "./material-provider";\n', "");
  next = next.replace(
    'export function UserSettingsDialog() {\n  return <MaterialProvider><SettingsContent /></MaterialProvider>;\n}',
    'export function UserSettingsDialog() {\n  return <SettingsContent />;\n}',
  );
  next = next.replace(
    '  const theme = useTheme();\n  const desktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });\n',
    "",
  );
  next = next.replace(
    /      <Dialog\n        open=\{settingsOpen\}[\s\S]*?      >\n        <header/,
    `      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>\n        <DialogContent\n          showCloseButton={false}\n          className="z-[2147483000] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-white/10 bg-[#050505] p-0 sm:h-[min(820px,92dvh)] sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-[24px]"\n        >\n          <header`,
  );
  next = next.replace(
    /            <Tabs[\s\S]*?            <\/Tabs>/,
    `            <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">\n              {SECTIONS.map(({ id, label, icon: Icon }) => {\n                const selected = section === id;\n                return (\n                  <button\n                    key={id}\n                    type="button"\n                    onClick={() => {\n                      setSection(id);\n                      setMessage("");\n                    }}\n                    className={\`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold transition md:w-full \${\n                      selected\n                        ? "bg-white/8 text-white"\n                        : "text-zinc-400 hover:bg-white/[.04] hover:text-white"\n                    }\`}\n                  >\n                    <Icon size={16} />\n                    <span className="whitespace-nowrap">{label}</span>\n                  </button>\n                );\n              })}\n            </div>`,
  );
  next = next.replaceAll(
    'onChange={(_, checked) => setHidePersonalInfo(checked)} slotProps={{ input: { "aria-label": "Hide personal information" } }}',
    'onCheckedChange={setHidePersonalInfo} aria-label="Hide personal information"',
  );
  next = next.replace(
    '          </main>\n        </div>\n      </Dialog>\n\n      <SmallDialog',
    '          </main>\n        </div>\n        </DialogContent>\n      </Dialog>\n\n      <Dialog',
  );
  next = next.replace('</SmallDialog>', '</Dialog>');

  const forbidden = [
    "@mui/",
    "MaterialProvider",
    "useMediaQuery",
    "useTheme",
    "<Tabs",
    "<Tab ",
    "<SmallDialog",
  ];
  for (const value of forbidden) {
    if (next.includes(value)) throw new Error(`Settings still contains ${value}`);
  }
  return next;
});

update(
  "src/features/trading-dashboard/components/dashboard-overview-polished.tsx",
  (source) => {
    let next = source.replace(
      'import CircularProgress from "@mui/material/CircularProgress"\n',
      "",
    );
    next = next.replace(
      /function MetricRing\(\{ value \}: \{ value: number \}\) \{[\s\S]*?\n\}\n\nfunction WeeklyStrip/,
      `function MetricRing({ value }: { value: number }) {\n  const bounded = clamp(value)\n  const radius = 31\n  const circumference = 2 * Math.PI * radius\n  const dashOffset = circumference - (bounded / 100) * circumference\n\n  return (\n    <div className="relative grid size-[72px] shrink-0 place-items-center sm:size-[76px]">\n      <svg\n        aria-hidden="true"\n        viewBox="0 0 72 72"\n        className="absolute inset-0 size-full -rotate-90"\n      >\n        <circle\n          cx="36"\n          cy="36"\n          r={radius}\n          fill="none"\n          stroke="rgba(255,255,255,.09)"\n          strokeWidth="5"\n        />\n        <circle\n          cx="36"\n          cy="36"\n          r={radius}\n          fill="none"\n          stroke={bounded >= 50 ? "#22c55e" : "#f59e0b"}\n          strokeWidth="5"\n          strokeLinecap="round"\n          strokeDasharray={circumference}\n          strokeDashoffset={dashOffset}\n          className="transition-[stroke-dashoffset] duration-500 ease-out"\n        />\n      </svg>\n      <div className="text-center">\n        <p className="text-lg font-bold leading-none tabular-nums text-white">\n          {Math.round(bounded)}%\n        </p>\n        <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.13em] text-zinc-500">\n          Win rate\n        </p>\n      </div>\n    </div>\n  )\n}\n\nfunction WeeklyStrip`,
    );
    if (next.includes("CircularProgress") || next.includes("@mui/")) {
      throw new Error("Dashboard MUI ring cleanup was incomplete.");
    }
    return next;
  },
);

update("package.json", (source) => {
  const pkg = JSON.parse(source);
  for (const dependency of [
    "@emotion/cache",
    "@emotion/react",
    "@emotion/styled",
    "@mui/material",
    "@mui/material-nextjs",
  ]) {
    delete pkg.dependencies[dependency];
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
});

if (existsSync("src/components/material-provider.tsx")) {
  unlinkSync("src/components/material-provider.tsx");
}

for (const path of [
  "tools/apply-remove-mui.mjs",
  ".github/workflows/apply-remove-mui.yml",
]) {
  if (existsSync(path)) unlinkSync(path);
}
