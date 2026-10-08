import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-client-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const siteUrl = "https://www.rescom-alert.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RESCOM ALERT — 10RCDG Mass Notification System",
    template: "%s | RESCOM ALERT",
  },
  description:
    "Official mass text messaging and emergency notification system for the 10th Regional Community Defense Group (10RCDG), Reserve Command, Philippine Army.",
  keywords: [
    "RESCOM ALERT",
    "10RCDG",
    "Reserve Command",
    "Philippine Army",
    "Emergency Alert System",
    "Mass Text Messaging",
    "Reservist Readiness",
    "Military Notification",
    "Javier Siliacay",
  ],
  authors: [{ name: "Javier Siliacay", url: "https://javiersiliacay.vercel.app/" }],
  creator: "Javier Siliacay",
  publisher: "10th Regional Community Defense Group (10RCDG), Reserve Command, Philippine Army",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "RESCOM ALERT — 10RCDG Mass Notification System",
    description:
      "Official mass text messaging and emergency notification system for 10th Regional Community Defense Group (10RCDG), Reserve Command, Philippine Army.",
    url: siteUrl,
    siteName: "RESCOM ALERT",
    images: [
      {
        url: "/rescom-emblem.jpg",
        width: 800,
        height: 800,
        alt: "10RCDG RESCOM ALERT Emblem",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RESCOM ALERT — 10RCDG Mass Notification System",
    description:
      "Official mass text messaging and emergency readiness system for 10RCDG, Reserve Command, Philippine Army.",
    images: ["/rescom-emblem.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/rescom-emblem.jpg", sizes: "32x32" },
      { url: "/rescom-emblem.jpg", sizes: "192x192" },
    ],
    shortcut: "/rescom-emblem.jpg",
    apple: "/rescom-emblem.jpg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "GovernmentOrganization",
      "@id": `${siteUrl}/#organization`,
      name: "10th Regional Community Defense Group (10RCDG)",
      alternateName: "10RCDG RESCOM Philippine Army",
      url: siteUrl,
      logo: `${siteUrl}/rescom-emblem.jpg`,
      parentOrganization: {
        "@type": "GovernmentOrganization",
        name: "Reserve Command, Philippine Army",
      },
      sameAs: [
        "https://www.facebook.com/profile.php?id=61586365277137",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#application`,
      name: "RESCOM ALERT",
      url: siteUrl,
      description:
        "Official mass notification and emergency broadcast portal for 10RCDG reservists.",
      applicationCategory: "EmergencyAlertApplication",
      operatingSystem: "Web, Android",
      author: {
        "@type": "Person",
        name: "Javier Siliacay",
        url: "https://javiersiliacay.vercel.app/",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-900 font-sans">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
