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

// In-memory / persisted authorized roster (with siliacay.javier@gmail.com as Commander)
export const initialAuthorizedRoster: Record<string, { role: UserRole; status: UserStatus; rank: string }> = {
  "siliacay.javier@gmail.com": {
    role: "COMMANDER",
    status: "ACTIVE",
    rank: "Group Commander",
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
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      return true;
    },
    async session({ session, token }) {
      if (session.user && session.user.email) {
        const userEmail = session.user.email.toLowerCase();
        const commanderEmail = (process.env.COMMANDER_EMAIL || "siliacay.javier@gmail.com").toLowerCase();
        
        // Auto-assign Commander role to root email
        if (userEmail === commanderEmail) {
          (session.user as any).role = "COMMANDER";
          (session.user as any).status = "ACTIVE";
          (session.user as any).rank = "Group Commander";
        } else {
          const authorized = initialAuthorizedRoster[userEmail];
          (session.user as any).role = authorized ? authorized.role : "OPERATOR";
          (session.user as any).status = authorized ? authorized.status : "ACTIVE";
          (session.user as any).rank = authorized ? authorized.rank : "Personnel Officer";
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      return token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15-Minute Session Inactivity Security Lock
  },
  secret: process.env.AUTH_SECRET,
});
