import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { AccountCardMenuBridge } from "@/components/account-card-menu-bridge";
import { AuthProvider } from "@/components/auth-context";
import { FloatingAddTradeButton } from "@/components/floating-add-trade-button";
import { MobileTradesBridge } from "@/components/mobile-trades-bridge";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./globals.css";
import "./auth-landing-v2.css";
import "./auth-landing-clean.css";
import "./onyx-overrides.css";
import "./responsive-fixes.css";
import "./quality-overrides.css";
import "./sidebar-width.css";
import "./dashboard-cleanups.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tradox",
  description: "Tradox: trading feed, private chats, journal and backtesting workspace.",
  applicationName: "Tradox",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();
  const supabase = await getSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <html lang="en" className={`dark ${inter.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AuthProvider initialUser={data.user} initialConfigured={configured}>
            <AppShell />
            <AccountCardMenuBridge />
            <FloatingAddTradeButton />
            <MobileTradesBridge />
            <div className="hidden">{children}</div>
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
