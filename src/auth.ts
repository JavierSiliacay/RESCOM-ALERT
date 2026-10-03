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
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
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
          if (authCheck?.user) {
            const status = authCheck.user.status;
            if (status === "ACTIVE" || status === "APPROVED") {
              return true;
            }
            // For suspended/rejected accounts, allow handshake so session receives reason & duration, then proxy middleware routes them to exact error screen
            if (status === "SUSPENDED" || status === "REJECTED") {
              return true;
            }
          }
        }
      } catch (err) {
        console.error("Convex auth verification error:", err);
      }

      // If user is revoked or not in authorized roster, deny access
      return false;
    },

    async jwt({ token }) {
      if (token.email) {
        const userEmail = token.email.toLowerCase().trim();
        if (userEmail === DEVELOPER_EMAIL) {
          token.role = "DEVELOPER";
          token.status = "ACTIVE";
          token.rank = "System Developer";
          token.unit = "10RCDG HQ / Technical Dev";
          token.isRevoked = false;
        } else if (userEmail === ROOT_COMMANDER_EMAIL) {
          token.role = "COMMANDER";
          token.status = "ACTIVE";
          token.rank = "Group Commander";
          token.unit = "10RCDG HQ";
          token.isRevoked = false;
        } else {
          try {
            const convex = getConvexClient();
            if (convex) {
              const authCheck = await convex.query(api.access.checkByEmail, { email: userEmail });
              if (authCheck?.user) {
                token.role = authCheck.user.role || "VIEWER";
                token.status = authCheck.user.status || "ACTIVE";
                token.rank = authCheck.user.rank || "Staff Officer";
                token.unit = authCheck.user.unit || "10RCDG HQ";
                token.isRevoked = !authCheck.isAuthorized || token.status === "SUSPENDED" || token.status === "REJECTED";
                token.suspendedReason = authCheck.user.suspendedReason;
                token.suspendedDuration = authCheck.user.suspendedDuration;
                token.suspendedUntil = authCheck.user.suspendedUntil;
              } else {
                token.role = null;
                token.status = "REJECTED";
                token.isRevoked = true;
              }
            }
          } catch (err) {
            console.error("Convex JWT query error:", err);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
        (session.user as any).rank = token.rank;
        (session.user as any).unit = token.unit;
        (session.user as any).isRevoked = token.isRevoked;
        (session.user as any).suspendedReason = token.suspendedReason;
        (session.user as any).suspendedDuration = token.suspendedDuration;
        (session.user as any).suspendedUntil = token.suspendedUntil;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15-Minute Session Inactivity Security Lock
  },
  secret: process.env.AUTH_SECRET,
});
