import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DM_Sans } from "next/font/google";

import { AuthProvider } from "@/components/auth-context";
import { APP_ROOT_TAILWIND_CLASS } from "@/components/tailwind/app-tailwind-classes";
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
  "[&_.recharts-text]:font-sans [&_.recharts-cartesian-axis-tick-value]:font-sans [&_.recharts-tooltip-wrapper]:font-sans",
].join(" ");

export const metadata: Metadata = {
  title: "Tradoxy",
  description:
    "Tradoxy: trading feed, private chats, journal and analytics workspace.",
  applicationName: "Tradoxy",
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
        <AuthProvider
          initialUser={data.user}
          initialConfigured={configured}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
