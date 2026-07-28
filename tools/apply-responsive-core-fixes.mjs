import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

function update(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No responsive changes applied to ${path}`);
  writeFileSync(path, after);
}

update("src/components/workspace-app-router-shell-v2.tsx", (source) => {
  const replacement = `function CommunityRail({
  communityId,
  active,
  onNavigate,
  onBack,
}: {
  communityId: string;
  active: CommunitySection;
  onNavigate: (section: CommunitySection) => void;
  onBack: () => void;
}) {
  const [collapsed, setCollapsed] = useState(active === "chat");

  useEffect(() => {
    if (active === "chat") setCollapsed(true);
  }, [active]);

  return (
    <div className="contents [&>aside]:!left-[238px]">
      <CommunitySidebar
        communityId={communityId}
        active={active}
        onNavigate={onNavigate}
        onBack={onBack}
        onCollapsedChange={setCollapsed}
      />
      <div
        className={\`hidden shrink-0 transition-[width] duration-200 ease-out xl:block \${
          collapsed ? "w-[72px]" : "w-[236px]"
        }\`}
        aria-hidden="true"
      />
    </div>
  );
}

export function WorkspaceAppRouterShellV2`;

  const next = source.replace(
    /function CommunityRail\([\s\S]*?\n}\n\nexport function WorkspaceAppRouterShellV2/,
    replacement,
  );
  if (!next.includes("onCollapsedChange={setCollapsed}") || !next.includes("xl:block")) {
    throw new Error("Workspace responsive rail migration was incomplete.");
  }
  return next;
});

update("src/features/community/components/community-sidebar.tsx", (source) => {
  let next = source.replace(
    'import { useEffect, useRef, useState } from "react";',
    'import { useEffect, useState } from "react";',
  );
  next = next.replace(
    `  onBack,
}: {
  communityId: string;
  active: CommunitySection;
  onNavigate: (section: CommunitySection) => void;
  onBack: () => void;
}) {
  const asideRef = useRef<HTMLElement | null>(null);`,
    `  onBack,
  onCollapsedChange,
}: {
  communityId: string;
  active: CommunitySection;
  onNavigate: (section: CommunitySection) => void;
  onBack: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {`,
  );
  next = next.replace(
    /\n  useEffect\(\(\) => \{\n    const spacer = asideRef\.current\?\.nextElementSibling[\s\S]*?\n  \}, \[\]\);\n/,
    `
  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);
`,
  );
  next = next.replace(
    `    <aside
      ref={asideRef}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-white/[.075] bg-[#030303] transition-[width] duration-200 ease-out lg:flex"
      style={{ width: collapsed ? 72 : 236 }}
      data-community-sidebar={collapsed ? "collapsed" : "expanded"}
    >`,
    `    <aside
      className={\`fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-white/[.075] bg-[#030303] transition-[width] duration-200 ease-out xl:flex \${
        collapsed ? "w-[72px]" : "w-[236px]"
      }\`}
      data-community-sidebar={collapsed ? "collapsed" : "expanded"}
    >`,
  );
  if (next.includes("asideRef") || next.includes("style={{ width") || !next.includes("xl:flex")) {
    throw new Error("Community sidebar responsive migration was incomplete.");
  }
  return next;
});

update("src/components/sidebar.tsx", (source) => {
  const next = source.replace(
    'className="h-[100dvh] w-[76vw] max-w-[312px] p-0 sm:max-w-[312px] lg:hidden"',
    'className="h-dvh w-[min(88vw,22rem)] max-w-none p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden"',
  );
  if (!next.includes("w-[min(88vw,22rem)]")) throw new Error("Mobile sidebar width was not updated.");
  return next;
});

update("src/components/workspace-topbar.tsx", (source) => {
  const next = source.replace(
    `      <div
        className="grid items-center gap-2 lg:flex lg:min-w-0 lg:flex-1 lg:gap-5"
        style={{
          gridTemplateColumns: isHome
            ? "40px minmax(0, 1fr) auto auto"
            : "40px minmax(0, 1fr) auto",
        }}
      >`,
    `      <div
        className={\`grid min-w-0 items-center gap-2 lg:flex lg:flex-1 lg:gap-5 \${
          isHome
            ? "grid-cols-[40px_minmax(0,1fr)_auto_auto]"
            : "grid-cols-[40px_minmax(0,1fr)_auto]"
        }\`}
      >`,
  );
  if (next.includes("gridTemplateColumns") || !next.includes("grid-cols-[40px_minmax(0,1fr)_auto")) {
    throw new Error("Topbar Tailwind grid migration was incomplete.");
  }
  return next;
});

update("src/components/user-settings-dialog.tsx", (source) => {
  const next = source.replace(
    'className="z-[2147483000] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-white/10 bg-[#050505] p-0 sm:h-[min(820px,92dvh)] sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-[24px]"',
    'className="inset-0 z-[2147483000] flex h-dvh max-h-dvh w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-white/10 bg-[#050505] p-0 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-[min(820px,92dvh)] sm:max-h-[92dvh] sm:w-[calc(100vw-2rem)] sm:max-w-6xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px]"',
  );
  if (next.includes("w-screen") || next.includes("h-[100dvh]")) throw new Error("Settings dialog still uses overflowing viewport classes.");
  return next;
});

update("src/components/social-actions-v2.tsx", (source) => {
  let next = source.replace(
    'className="fixed inset-0 isolate z-[2147483647] flex h-[100dvh] w-screen items-start justify-center overflow-y-auto bg-black/82 p-3 pt-[max(1rem,env(safe-area-inset-top))] sm:p-4 sm:pt-[max(1rem,env(safe-area-inset-top))]"',
    'className="fixed inset-0 isolate z-[2147483647] flex min-h-dvh w-full items-start justify-center overflow-y-auto bg-black/82 px-2 py-[max(.5rem,env(safe-area-inset-top))] sm:p-4"',
  );
  next = next.replace(
    'className="relative z-10 flex h-[min(92dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#050505] text-white shadow-2xl shadow-black/80"',
    'className="relative z-10 flex min-h-0 max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#050505] text-white shadow-2xl shadow-black/80 sm:h-[min(92dvh,760px)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[30px]"',
  );
  next = next.replace('className="min-h-[360px] flex-1 overflow-y-auto overscroll-contain"', 'className="min-h-0 flex-1 overflow-y-auto overscroll-contain"');
  next = next.replace('className="max-h-[70dvh] min-h-[320px] overflow-y-auto"', 'className="min-h-0 flex-1 overflow-y-auto"');
  if (next.includes("w-screen") || next.includes("h-[100dvh]")) throw new Error("Social modal still uses overflowing viewport classes.");
  return next;
});

update("src/components/calendar-workspace-v3.tsx", (source) => {
  let next = source.replace(
    'className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6"',
    'className="grid grid-cols-2 gap-x-3 gap-y-4 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"',
  );
  next = next.replace(
    'className="grid grid-cols-4 gap-2 rounded-2xl border border-white/8 bg-[#090909] px-3 py-4"',
    'className="grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-[#090909] px-3 py-4 min-[480px]:grid-cols-4"',
  );
  if (!next.includes("min-[420px]:grid-cols-3") || !next.includes("min-[480px]:grid-cols-4")) {
    throw new Error("Calendar mobile grids were not updated.");
  }
  return next;
});

for (const path of [
  "tools/apply-responsive-core-fixes.mjs",
  ".github/workflows/apply-responsive-core-fixes.yml",
]) {
  if (existsSync(path)) unlinkSync(path);
}
