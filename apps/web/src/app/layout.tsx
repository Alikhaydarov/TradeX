import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tradoxy", template: "%s | Tradoxy" },
  description: "AI-assisted trading performance and risk intelligence."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

