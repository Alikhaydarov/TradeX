import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-context";
import { getInitialAuth } from "@/lib/server/get-initial-auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TradeUp",
  description: "TradeUp: trading feed, private chats, journal and backtesting workspace.",
  applicationName: "TradeUp",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const auth = await getInitialAuth();

  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider {...auth}>
          <AppShell />
          <div className="hidden">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
