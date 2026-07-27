import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DM_Sans } from "next/font/google";
import { AccountCardMenuBridge } from "@/components/account-card-menu-bridge";
import { AuthProvider } from "@/components/auth-context";
import { FloatingAddTradeButton } from "@/components/floating-add-trade-button";
import { MobileTradesBridge } from "@/components/mobile-trades-bridge";
import { ProAiCoachLauncherBoundary } from "@/components/pro-ai-coach-launcher-boundary";
import { APP_ROOT_TAILWIND_CLASS } from "@/components/tailwind/app-tailwind-classes";
import { WorkspaceTailwindBoundary } from "@/components/tailwind/workspace-tailwind-boundary";
import { WorkspaceAppRouterShell } from "@/components/workspace-app-router-shell";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
      className={`dark ${dmSans.variable}`}
      style={appFontVariables}
    >
      <body className={`${appTypographyClass} ${APP_ROOT_TAILWIND_CLASS}`}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AuthProvider
            initialUser={data.user}
            initialConfigured={configured}
          >
            <WorkspaceTailwindBoundary>
              <WorkspaceAppRouterShell>{children}</WorkspaceAppRouterShell>
            </WorkspaceTailwindBoundary>
            <AccountCardMenuBridge />
            <FloatingAddTradeButton />
            <MobileTradesBridge />
            <ProAiCoachLauncherBoundary />
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
