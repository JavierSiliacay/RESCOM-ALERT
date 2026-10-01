import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export type UserRole = "COMMANDER" | "ADMIN" | "OPERATOR" | "VIEWER";
export type UserStatus = "ACTIVE" | "PENDING" | "SUSPENDED";

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  status: UserStatus;
  rank?: string;
  unit?: string;
  approvedAt?: string;
  lastLoginAt?: string;
}

// Strict Whitelist of Authorized 10RCDG Personnel
export const initialAuthorizedRoster: Record<
  string,
  { role: UserRole; status: UserStatus; rank: string; name: string }
> = {
  "siliacay.javier@gmail.com": {
    role: "COMMANDER",
    status: "ACTIVE",
    rank: "Group Commander",
    name: "Javier Siliacay",
  },
  "salagustereynald48@gmail.com": {
    role: "ADMIN",
    status: "ACTIVE",
    rank: "Deputy Commander (LTC)",
    name: "Reynaldo Salaguste",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const userEmail = user.email.toLowerCase().trim();
      const commanderEmail = (process.env.COMMANDER_EMAIL || "siliacay.javier@gmail.com").toLowerCase().trim();

      // Check if user is the Commander or in authorized roster
      const isCommander = userEmail === commanderEmail;
      const rosterEntry = initialAuthorizedRoster[userEmail];

      if (!isCommander && !rosterEntry) {
        // Strict Whitelist Rejection: Deny login for unauthorized accounts
        return "/sign-in?error=AccessDenied";
      }

      if (!isCommander && rosterEntry.status !== "ACTIVE") {
        return "/sign-in?error=AccountSuspended";
      }

      return true;
    },
    async session({ session }) {
      if (session.user && session.user.email) {
        const userEmail = session.user.email.toLowerCase().trim();
        const commanderEmail = (process.env.COMMANDER_EMAIL || "siliacay.javier@gmail.com").toLowerCase().trim();

        if (userEmail === commanderEmail) {
          (session.user as any).role = "COMMANDER";
          (session.user as any).status = "ACTIVE";
          (session.user as any).rank = "Group Commander";
        } else {
          const authorized = initialAuthorizedRoster[userEmail];
          (session.user as any).role = authorized?.role || "VIEWER";
          (session.user as any).status = authorized?.status || "ACTIVE";
          (session.user as any).rank = authorized?.rank || "Staff Officer";
        }
      }
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15-Minute Session Inactivity Security Lock
  },
  secret: process.env.AUTH_SECRET,
});
