import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientChatboxGate from "@/components/ClientChatboxGate";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Script from "next/script";
import { siteConfig } from "@/config/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: "/" },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: `${siteConfig.name}`,
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    images: [
      { url: "/logo.png", width: 1200, height: 630, alt: siteConfig.name },
    ],
    locale: "id_ID",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name}`,
    description: siteConfig.description,
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: new URL("/logo.png", siteConfig.url).toString(),
    sameAs: [siteConfig.social.instagram, siteConfig.social.tiktok].filter(Boolean),
  };
  return (
    <html lang="en">
      <head>
        {/* Favicon & Icons fallback (pakai PNG supaya universal) */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Fallbacks */}
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {GA_ID ? (
          <>
            <Script id="gtag-src" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        ) : null}
        <Script id="org-json-ld" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(orgLd)}
        </Script>
        <Header />
        <div className="min-h-[100dvh] flex flex-col">
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <Footer />
        </div>
        <ClientChatboxGate />
      </body>
    </html>
  );
}
