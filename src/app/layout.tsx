import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { AccountCardMenuBridge } from "@/components/account-card-menu-bridge";
import { AuthProvider } from "@/components/auth-context";
import { FloatingAddTradeButton } from "@/components/floating-add-trade-button";
import { ProAiCoachLauncher } from "@/components/pro-ai-coach-launcher";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./globals.css";
import "./auth-landing-v2.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="en" className={`dark ${dmSans.variable}`}>
      <body className="font-sans antialiased">
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AuthProvider
            initialUser={data.user}
            initialConfigured={configured}
          >
            {children}
            <AccountCardMenuBridge />
            <FloatingAddTradeButton />
            <ProAiCoachLauncher />
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
