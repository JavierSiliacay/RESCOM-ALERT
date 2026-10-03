import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  const user = session?.user as any;

  const isAuthorized =
    !!user &&
    !user.isRevoked &&
    !!user.role &&
    user.status !== "SUSPENDED" &&
    user.status !== "REJECTED";

  if (isAuthorized) {
    redirect("/dashboard");
  } else {
    redirect("/sign-in");
  }
}
