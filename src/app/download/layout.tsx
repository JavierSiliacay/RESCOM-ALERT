import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Soldier APK — RESCOM ALERT | 10RCDG PA",
  description:
    "Official Android application download portal for 10th Regional Community Defense Group (10RCDG) reservists. Features offline SMS siren, instant emergency mobilization, and soldier readiness tracking.",
  alternates: {
    canonical: "/download",
  },
  openGraph: {
    title: "Download Soldier APK — RESCOM ALERT | 10RCDG PA",
    description:
      "Official 10RCDG mobile emergency alert app. Direct APK download for military personnel and reservists.",
    url: "https://www.rescom-alert.site/download",
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
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
