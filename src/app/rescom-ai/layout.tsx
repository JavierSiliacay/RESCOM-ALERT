import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RESCOM AI — Basic ROTC & Military Science Intelligence Reference | 10RCDG",
  description:
    "Official 10RCDG military science knowledge assistant for Northern Mindanao Ready Reservists and Basic ROTC Cadets (MS 1 & MS 2). Inquire about 11 General Orders, Philippine Army ranks, drills, military courtesy, and civil defense.",
  alternates: {
    canonical: "https://www.rescom-alert.site/rescom-ai",
  },
};

export default function RescomAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
