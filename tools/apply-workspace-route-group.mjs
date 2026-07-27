import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const workspaceRoot = "src/app/(workspace)";
mkdirSync(workspaceRoot, { recursive: true });

const workspaceLayoutComponent = `import type { ReactNode } from "react";

import { AccountCardMenuBridge } from "@/components/account-card-menu-bridge";
import { FloatingAddTradeButton } from "@/components/floating-add-trade-button";
import { MobileTradesBridge } from "@/components/mobile-trades-bridge";
import { ProAiCoachLauncherBoundary } from "@/components/pro-ai-coach-launcher-boundary";
import { WorkspaceTailwindBoundary } from "@/components/tailwind/workspace-tailwind-boundary";
import { WorkspaceAppRouterShellV2 } from "@/components/workspace-app-router-shell-v2";

export function WorkspaceRouteLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceTailwindBoundary>
      <WorkspaceAppRouterShellV2>{children}</WorkspaceAppRouterShellV2>
      <AccountCardMenuBridge />
      <FloatingAddTradeButton />
      <MobileTradesBridge />
      <ProAiCoachLauncherBoundary />
    </WorkspaceTailwindBoundary>
  );
}
`;

const groupLayout = `import type { ReactNode } from "react";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceRouteLayout>{children}</WorkspaceRouteLayout>;
}
`;

const groupLoading = `import { PageSkeleton } from "@/components/page-skeleton";

export default function WorkspaceLoading() {
  return <PageSkeleton label="Loading workspace" />;
}
`;

const rootLayout = `import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DM_Sans } from "next/font/google";

import { AuthProvider } from "@/components/auth-context";
import { APP_ROOT_TAILWIND_CLASS } from "@/components/tailwind/app-tailwind-classes";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const appFontVariables = {
  "--font-app":
    'var(--font-dm-sans), "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-inter": "var(--font-app)",
  "--font-geist-mono": "var(--font-app)",
} as CSSProperties;

const appTypographyClass = [
  "font-sans antialiased [font-synthesis:none] [text-rendering:optimizeLegibility]",
  "[&_.font-heading]:font-sans [&_.font-mono]:font-sans [&_.font-mono]:tabular-nums [&_.font-mono]:tracking-[-0.015em]",
  "[&_.MuiTypography-root]:font-sans [&_.MuiButton-root]:font-sans [&_.MuiInputBase-root]:font-sans",
  "[&_.MuiFormLabel-root]:font-sans [&_.MuiChip-root]:font-sans [&_.MuiTooltip-tooltip]:font-sans",
  "[&_.MuiMenuItem-root]:font-sans [&_.MuiTab-root]:font-sans [&_.MuiTableCell-root]:font-sans",
  "[&_.recharts-text]:font-sans [&_.recharts-cartesian-axis-tick-value]:font-sans [&_.recharts-tooltip-wrapper]:font-sans",
].join(" ");

export const metadata: Metadata = {
  title: "Tradox",
  description:
    "Tradox: trading feed, private chats, journal and backtesting workspace.",
  applicationName: "Tradox",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();
  const supabase = await getSupabaseServerClient();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <html
      lang="en"
      className={\`dark \${dmSans.variable}\`}
      style={appFontVariables}
    >
      <body className={\`\${appTypographyClass} \${APP_ROOT_TAILWIND_CLASS}\`}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AuthProvider
            initialUser={data.user}
            initialConfigured={configured}
          >
            {children}
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
`;

writeFileSync("src/components/workspace-route-layout.tsx", workspaceLayoutComponent);
writeFileSync(join(workspaceRoot, "layout.tsx"), groupLayout);
writeFileSync(join(workspaceRoot, "loading.tsx"), groupLoading);
writeFileSync("src/app/layout.tsx", rootLayout);

const routeEntries = [
  "page.tsx",
  "accounts",
  "admin",
  "analytics",
  "backtest",
  "calendar",
  "community",
  "dashboard",
  "economic-calendar",
  "journal",
  "pricing",
  "profile",
  "settings",
  "superadmin",
  "trades",
  "[username]",
];

for (const entry of routeEntries) {
  const source = join("src/app", entry);
  const target = join(workspaceRoot, entry);
  if (!existsSync(source)) continue;
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  renameSync(source, target);
}

if (existsSync("src/components/app-shell.tsx")) {
  unlinkSync("src/components/app-shell.tsx");
}

for (const file of [
  "tools/apply-workspace-route-group.mjs",
  ".github/workflows/apply-workspace-route-group.yml",
]) {
  if (existsSync(file)) unlinkSync(file);
}
