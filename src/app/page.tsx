import React from "react";
import { auth } from "@/auth";
import { PublicLandingView } from "@/components/public-landing-view";

export const metadata = {
  title: "10RCDG — 10th Regional Community Defense Group | Philippine Army",
  description:
    "Official public civil defense, disaster response, and Ready Reserve readiness portal for Northern Mindanao (Region X), 10RCDG Reserve Command, Philippine Army.",
  alternates: {
    canonical: "https://www.rescom-alert.site",
  },
};

export default async function Home() {
  const session = await auth();
  const user = session?.user as any;

  const isAuthorized =
    !!user &&
    !user.isRevoked &&
    !!user.role &&
    user.status !== "SUSPENDED" &&
    user.status !== "REJECTED";

  return (
    <PublicLandingView
      isOfficerLoggedIn={isAuthorized}
      officerName={user?.name || user?.firstName}
      officerRank={user?.rank}
    />
  );
}
