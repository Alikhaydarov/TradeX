import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";

import { AuthProvider } from "@/components/auth-context";
import { LegacyI18nBoundary } from "@/components/legacy-i18n-boundary";
import { APP_ROOT_TAILWIND_CLASS } from "@/components/tailwind/app-tailwind-classes";
import {
  localeCookieName,
  localeTags,
  normalizeLocale,
} from "@/lib/i18n-config";
import { I18nProvider } from "@/lib/i18n";
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

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  // Without a metadataBase the generated Open Graph image resolves to a
  // relative path, which link previews cannot fetch.
  metadataBase: new URL(appUrl),
  title: {
    default: "Tradoxy",
    template: "%s | Tradoxy",
  },
  description:
    "Tradoxy: trading feed, private chats, journal and analytics workspace.",
  applicationName: "Tradoxy",
  openGraph: {
    type: "website",
    siteName: "Tradoxy",
    title: "Tradoxy",
    description:
      "Tradoxy: trading feed, private chats, journal and analytics workspace.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tradoxy",
    description:
      "Tradoxy: trading feed, private chats, journal and analytics workspace.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();
  const supabase = await getSupabaseServerClient();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const cookieStore = await cookies();
  const initialLocale = normalizeLocale(
    cookieStore.get(localeCookieName)?.value,
  );

  return (
    <html
      lang={localeTags[initialLocale]}
      dir="ltr"
      data-locale={initialLocale}
      className={`dark ${dmSans.variable}`}
      style={appFontVariables}
    >
      <body className={`${appTypographyClass} ${APP_ROOT_TAILWIND_CLASS}`}>
        <I18nProvider initialLocale={initialLocale}>
          <LegacyI18nBoundary>
            <AuthProvider
              initialUser={data.user}
              initialConfigured={configured}
            >
              {children}
            </AuthProvider>
          </LegacyI18nBoundary>
        </I18nProvider>
      </body>
    </html>
  );
}
