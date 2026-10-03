import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

export type UserRole = "DEVELOPER" | "COMMANDER" | "ADMIN" | "OPERATOR" | "VIEWER";
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

// Exclusive Master System Developer Email
const DEVELOPER_EMAIL = "siliacay.javier@gmail.com";

const ROOT_COMMANDER_EMAIL = (
  process.env.COMMANDER_EMAIL || "siliacay.javier@gmail.com"
).toLowerCase().trim();

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

      // 1. Exclusive System Developer & Root Commander have unconditional master access
      if (userEmail === DEVELOPER_EMAIL || userEmail === ROOT_COMMANDER_EMAIL) {
        return true;
      }

      // 2. Strict Database Verification via Convex
      try {
        const convex = getConvexClient();
        if (convex) {
          const authCheck = await convex.query(api.access.checkByEmail, { email: userEmail });
          if (authCheck?.isAuthorized && authCheck.user) {
            const status = authCheck.user.status;
            if (status === "SUSPENDED" || status === "REJECTED") {
              return "/sign-in?error=AccountSuspended";
            }
            if (status === "ACTIVE" || status === "APPROVED") {
              return true;
            }
          }
        }
      } catch (err) {
        console.error("Convex auth verification error:", err);
      }

      // If user is revoked or not in authorized roster, deny access
      return "/sign-in?error=AccessDenied";
    },

    async session({ session }) {
      if (session.user && session.user.email) {
        const userEmail = session.user.email.toLowerCase().trim();

        // Exclusive Developer Role for siliacay.javier@gmail.com
        if (userEmail === DEVELOPER_EMAIL) {
          (session.user as any).role = "DEVELOPER";
          (session.user as any).status = "ACTIVE";
          (session.user as any).rank = "System Developer";
          (session.user as any).unit = "10RCDG HQ / Technical Dev";
        } else if (userEmail === ROOT_COMMANDER_EMAIL) {
          (session.user as any).role = "COMMANDER";
          (session.user as any).status = "ACTIVE";
          (session.user as any).rank = "Group Commander";
          (session.user as any).unit = "10RCDG HQ";
        } else {
          let role: UserRole = "VIEWER";
          let status: UserStatus = "ACTIVE";
          let rank: string = "Staff Officer";
          let unit: string = "10RCDG HQ";

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
