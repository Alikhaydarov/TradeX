import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { AccountCardMenuBridge } from "@/components/account-card-menu-bridge";
import { AuthProvider } from "@/components/auth-context";
import { FloatingAddTradeButton } from "@/components/floating-add-trade-button";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./globals.css";
import "./auth-landing-v2.css";
import "./auth-landing-clean.css";
import "./onyx-overrides.css";
import "./responsive-fixes.css";
import "./trades-responsive.css";
import "./quality-overrides.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
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
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider initialUser={data.user} initialConfigured={configured}>
          <AppShell />
          <AccountCardMenuBridge />
          <FloatingAddTradeButton />
          <div className="hidden">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
