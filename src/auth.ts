import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

export type UserRole = "COMMANDER" | "ADMIN" | "OPERATOR" | "VIEWER";
export type UserStatus = "ACTIVE" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

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

// Master Commander emails whitelist
const COMMANDER_EMAILS = [
  "siliacay.javier@gmail.com",
  "javiersiliacaysiliacay1234@gmail.com",
  (process.env.COMMANDER_EMAIL || "").toLowerCase().trim(),
].filter(Boolean);

// Fallback Whitelist of Authorized 10RCDG Personnel
export const initialAuthorizedRoster: Record<
  string,
  { role: UserRole; status: UserStatus; rank: string; name: string; unit?: string }
> = {
  "siliacay.javier@gmail.com": {
    role: "COMMANDER",
    status: "ACTIVE",
    rank: "Group Commander",
    name: "Javier Siliacay",
    unit: "10RCDG HQ",
  },
  "javiersiliacaysiliacay1234@gmail.com": {
    role: "COMMANDER",
    status: "ACTIVE",
    rank: "Group Commander",
    name: "Javier Siliacay",
    unit: "10RCDG HQ",
  },
  "salagustereynald48@gmail.com": {
    role: "ADMIN",
    status: "ACTIVE",
    rank: "Deputy Commander (LTC)",
    name: "Reynaldo Salaguste",
    unit: "10RCDG HQ",
  },
};

const getConvexClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  return new ConvexHttpClient(url);
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

      // 1. Check if user is a designated Group Commander
      if (COMMANDER_EMAILS.includes(userEmail)) {
        return true;
      }

      // 2. Check local preset whitelist
      const rosterEntry = initialAuthorizedRoster[userEmail];
      if (rosterEntry) {
        if (rosterEntry.status === "SUSPENDED" || rosterEntry.status === "REJECTED") {
          return "/sign-in?error=AccountSuspended";
        }
        return true;
      }

      // 3. Check dynamic Convex database (authorizedUsers & personnel tables)
      try {
        const convex = getConvexClient();
        if (convex) {
          const authCheck = await convex.query(api.access.checkByEmail, { email: userEmail });
          if (authCheck?.isAuthorized && authCheck.user) {
            const status = authCheck.user.status;
            if (status === "SUSPENDED" || status === "REJECTED") {
              return "/sign-in?error=AccountSuspended";
            }
            return true;
          }
        }
      } catch (err) {
        console.error("Convex auth verification error:", err);
      }

      // Strict Whitelist Rejection: Deny login for unauthorized accounts
      return "/sign-in?error=AccessDenied";
    },

    async session({ session }) {
      if (session.user && session.user.email) {
        const userEmail = session.user.email.toLowerCase().trim();

        if (COMMANDER_EMAILS.includes(userEmail)) {
          (session.user as any).role = "COMMANDER";
          (session.user as any).status = "ACTIVE";
          (session.user as any).rank = "Group Commander";
          (session.user as any).unit = "10RCDG HQ";
        } else {
          // Check static roster first
          const localEntry = initialAuthorizedRoster[userEmail];
          let role: UserRole = localEntry?.role || "OPERATOR";
          let status: UserStatus = localEntry?.status || "ACTIVE";
          let rank: string = localEntry?.rank || "Staff Officer";
          let unit: string = localEntry?.unit || "10RCDG HQ";

          // Try checking dynamic Convex record
          try {
            const convex = getConvexClient();
            if (convex) {
              const authCheck = await convex.query(api.access.checkByEmail, { email: userEmail });
              if (authCheck?.isAuthorized && authCheck.user) {
                role = (authCheck.user.role as UserRole) || role;
                status = (authCheck.user.status as UserStatus) || status;
                rank = authCheck.user.rank || rank;
                unit = authCheck.user.unit || unit;
              }
            }
          } catch (err) {
            console.error("Convex session role query error:", err);
          }

          (session.user as any).role = role;
          (session.user as any).status = status;
          (session.user as any).rank = rank;
          (session.user as any).unit = unit;
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
