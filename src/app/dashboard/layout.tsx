import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "./dashboard-nav";
import { OfficerProvider } from "@/components/officer-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !session.user) redirect("/sign-in");

  const isRevoked = (session.user as any).isRevoked;
  const userStatus = (session.user as any).status;
  const userRole = (session.user as any).role;

  // Immediately kick out revoked, suspended, or unassigned personnel
  if (isRevoked || userStatus === "SUSPENDED" || userStatus === "REJECTED" || !userRole) {
    redirect("/sign-in?error=AccessRevoked");
  }

  const userName = session.user.name || "Officer";
  const userEmail = session.user.email || ""; 
  const userImage = session.user.image || "";
  const userRank = (session.user as any).rank || "Staff Officer";

  const displayName =
    userRank && userRank !== "Staff Officer" && userRank !== "Personnel Officer"
      ? `${userRank} ${userName}`
      : userName;

  const officer = {
    name: userName,
    email: userEmail,
    rank: userRank,
    role: userRole,
    displayName,
  };

  return (
    <OfficerProvider officer={officer}>
      <DashboardNav
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        userRole={userRole}
        userRank={userRank}
      >
        {children}
      </DashboardNav>
    </OfficerProvider>
  );
}
