import type { Metadata } from "next";
import { Geist_Mono, Inter, Newsreader } from "next/font/google";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { PwaRegister } from "@/components/pwa-register";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: "InkRail - Web đọc truyện tranh editorial-minimal",
    template: "%s | InkRail",
  },
  description:
    "Web đọc truyện tranh tối giản, ưu tiên trải nghiệm đọc, SEO tốt, đa nguồn MangaDex/OTruyen và đồng bộ thư viện bằng Supabase.",
  applicationName: "InkRail",
  authors: [{ name: "InkRail" }],
  openGraph: {
    type: "website",
    siteName: "InkRail",
    title: "InkRail",
    description: "Một giao diện đọc truyện tranh editorial-minimal, tập trung vào reader.",
  },
  twitter: {
    card: "summary_large_image",
    title: "InkRail",
    description: "Web đọc truyện tranh editorial-minimal với Next.js và Supabase.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} ${newsreader.variable} ${geistMono.variable}`}>
      <body className="min-h-screen pb-16 font-ui md:pb-0">
        <SiteHeader />
        {children}
        <MobileTabBar />
        <PwaRegister />
      </body>
    </html>
  );
}
