import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TradeWay",
  description: "Auto trading journal, MT5 sync, prop account analytics and Traderox AI coach.",
  applicationName: "TradeWay",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();
  const supabase = await getSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider initialUser={data.user} initialConfigured={configured}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
