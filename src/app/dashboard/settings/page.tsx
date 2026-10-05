import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SettingsClient } from "./settings-client";

export default async function GatewaySettingsPage() {
  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase().trim() || "";
  const developerEmail = (
    process.env.DEVELOPER_EMAIL ||
    process.env.COMMANDER_EMAIL ||
    "siliacay.javier@gmail.com"
  )
    .toLowerCase()
    .trim();

  const isDeveloper =
    userEmail === developerEmail || (session?.user as any)?.role === "DEVELOPER";

  // If not the developer, redirect completely away
  if (!isDeveloper) {
    redirect("/dashboard");
  }

  // Developer is authenticated -> render the full Gateway Settings console
  return <SettingsClient />;
}


