import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RESCOM ALERT — Mass Notification System",
  description:
    "Official mass text messaging and notification system for 10th Regional Community Defense Group, RESCOM PA.",
  icons: {
    icon: [
      { url: "/rescom-emblem.jpg", sizes: "32x32" },
      { url: "/rescom-emblem.jpg", sizes: "192x192" },
    ],
    shortcut: "/rescom-emblem.jpg",
    apple: "/rescom-emblem.jpg",
  },
};

import { ConvexClientProvider } from "@/components/convex-client-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-900 font-sans">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
