import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

const path = "src/components/sidebar.tsx";
let source = readFileSync(path, "utf8");

source = source.replace(
  'import Image from "next/image";',
  'import Image from "next/image";\nimport Link from "next/link";',
);
source = source.replace(
  'import { Dialog, DialogContent } from "./ui/dialog";',
  'import { Sheet, SheetContent } from "./ui/sheet";',
);
source = source.replace(
  'import type { PropAccount, Section } from "./types";',
  'import type { PropAccount, Section } from "./types";\nimport { pathFromSection } from "./section-config";',
);

const oldNav = `    return (
      <button
        key={id}
        onClick={() => {
          if (mobile) setMobileMenuOpen(false);
          onChange(id);
        }}
        className={\`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition \${
          selected
            ? "bg-[#111111] text-white ring-1 ring-white/10"
            : "text-zinc-400 hover:bg-[#080808] hover:text-white"
        }\`}
      >
        <span
          className={\`grid h-7 w-7 place-items-center rounded-lg transition-colors \${selected ? "bg-[#1a1a1a] text-white" : "bg-[#050505] text-zinc-500 group-hover:bg-[#0f0f0f] group-hover:text-zinc-300"}\`}
        >
          <Icon size={15} strokeWidth={selected ? 2.3 : 2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {label}
        </span>
      </button>
    );`;

const newNav = `    return (
      <Link
        key={id}
        href={pathFromSection(id)}
        prefetch
        onClick={(event) => {
          event.preventDefault();
          if (mobile) setMobileMenuOpen(false);
          onChange(id);
        }}
        className={\`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition \${
          mobile ? "min-h-11" : ""
        } \${
          selected
            ? "bg-[#111111] text-white ring-1 ring-white/10"
            : "text-zinc-400 hover:bg-[#080808] hover:text-white"
        }\`}
      >
        <span
          className={\`grid h-7 w-7 place-items-center rounded-lg transition-colors \${selected ? "bg-[#1a1a1a] text-white" : "bg-[#050505] text-zinc-500 group-hover:bg-[#0f0f0f] group-hover:text-zinc-300"}\`}
        >
          <Icon size={15} strokeWidth={selected ? 2.3 : 2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {label}
        </span>
      </Link>
    );`;

if (!source.includes(oldNav)) {
  throw new Error("Sidebar navigation block was not found.");
}
source = source.replace(oldNav, newNav);

source = source.replace(
  '<Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>\n          <DialogContent\n            showCloseButton={false}\n            className="left-0 top-0 h-[100dvh] w-[76vw] max-w-[312px] translate-x-0 translate-y-0 rounded-none border-r border-white/10 bg-black p-0 sm:max-w-[312px] lg:hidden"\n          >',
  '<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>\n          <SheetContent\n            side="left"\n            showCloseButton={false}\n            className="h-[100dvh] w-[76vw] max-w-[312px] p-0 sm:max-w-[312px] lg:hidden"\n          >',
);
source = source.replace(
  '          </DialogContent>\n        </Dialog>',
  '          </SheetContent>\n        </Sheet>',
);

if (source.includes("<Dialog open={mobileMenuOpen}")) {
  throw new Error("Mobile Dialog migration did not complete.");
}

writeFileSync(path, source);

for (const file of [
  "tools/apply-sidebar-sheet.mjs",
  ".github/workflows/apply-sidebar-sheet.yml",
]) {
  if (existsSync(file)) unlinkSync(file);
}
