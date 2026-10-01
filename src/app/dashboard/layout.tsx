import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !session.user) redirect("/sign-in");

  const userName = session.user.name || "Officer";
  const userEmail = session.user.email || ""; 
  const userImage = session.user.image || "";
  const userRole = (session.user as any).role || "COMMANDER";
  const userRank = (session.user as any).rank || "Group Commander";

  return (
    <DashboardNav
      userName={userName}
      userEmail={userEmail}
      userImage={userImage}
      userRole={userRole}
      userRank={userRank}
    >
      {children}
    </DashboardNav>
  );
}
