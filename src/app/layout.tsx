import type { Metadata } from "next";
import { Geist_Mono, Inter, Newsreader } from "next/font/google";
import Script from "next/script";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { PageTransition } from "@/components/page-transition";
import { PwaRegister } from "@/components/pwa-register";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/seo";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
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
    default: siteConfig.title,
    template: "%s | InkRail",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "manga reader",
  keywords: siteConfig.keywords,
  alternates: {
    canonical: absoluteUrl("/"),
    types: {
      "application/rss+xml": [{ url: absoluteUrl("/rss.xml"), title: "InkRail - Chương mới" }],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.shortTitle,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.ogDescription,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "InkRail - đọc truyện tranh mobile-first với reader tối giản",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.ogDescription,
    images: [siteConfig.twitterImage],
  },
  icons: {
    icon: [
      { url: "/icon/32", sizes: "32x32", type: "image/png" },
      { url: "/icon/192", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png" }],
    shortcut: ["/icon.svg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabaseEnv = getSupabasePublicEnv();

  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} ${newsreader.variable} ${geistMono.variable}`}>
      <head>
        <Script id="inkrail-theme" strategy="beforeInteractive">
          {`(() => {
  try {
    const stored = localStorage.getItem('inkrail-theme');
    document.documentElement.dataset.theme = stored === 'light' ? 'light' : 'dark';
  } catch {
    document.documentElement.dataset.theme = 'dark';
  }
})();`}
        </Script>
        <Script id="strip-extension-link-attrs" strategy="beforeInteractive">
          {`(() => {
  const stripAttrs = (root = document) => {
    root.querySelectorAll?.('[rtrvr-ls],[rtrvr-ro]').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.startsWith('rtrvr-')) element.removeAttribute(attribute.name);
      });
    });
  };

  stripAttrs();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName?.startsWith('rtrvr-')) {
        mutation.target.removeAttribute(mutation.attributeName);
        return;
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) stripAttrs(node);
      });
    });
  });

  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  window.addEventListener('load', () => window.setTimeout(() => observer.disconnect(), 3000), { once: true });
})();`}
        </Script>
      </head>
      <body className="min-h-screen pb-20 font-ui md:pb-0">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-[var(--radius-control)] focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:shadow-[var(--shadow-lift)]"
        >
          Bỏ qua tới nội dung chính
        </a>
        <SiteHeader supabaseEnv={supabaseEnv} />
        <PageTransition>
          <div id="main-content">{children}</div>
        </PageTransition>
        <MobileTabBar />
        <PwaRegister />
      </body>
    </html>
  );
}
