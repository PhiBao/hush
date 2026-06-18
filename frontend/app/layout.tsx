import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "../components/Providers";
import { SiteShell } from "../components/site/SiteShell";

export const metadata: Metadata = {
  title: "Hush - Confidential Creator Subscriptions",
  description:
    "Earn from your audience. Privately. Subscription payments your subscribers can trust and nobody else can see.",
  applicationName: "Hush",
  authors: [{ name: "Hush" }],
  openGraph: {
    title: "Hush - Confidential Creator Subscriptions",
    description:
      "Subscription payments encrypted onchain. Only the creator decrypts their total. Nobody else sees anything.",
    type: "website",
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="grain min-h-[100dvh]">
        <Providers>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
