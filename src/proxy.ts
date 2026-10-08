import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const user = req.auth?.user as any;
  const isAuthorized =
    !!user &&
    !user.isRevoked &&
    !!user.role &&
    user.status !== "SUSPENDED" &&
    user.status !== "REJECTED";

  const isSignInPage = req.nextUrl.pathname.startsWith("/sign-in");
  const isEnlistPage = req.nextUrl.pathname.startsWith("/enlist");
  const isDownloadPage = req.nextUrl.pathname.startsWith("/download");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
  const isApi = req.nextUrl.pathname.startsWith("/api");
  const isPublicFile =
    req.nextUrl.pathname === "/robots.txt" ||
    req.nextUrl.pathname === "/sitemap.xml" ||
    req.nextUrl.pathname.startsWith("/sitemap");

  if (isAuthApi || isEnlistPage || isDownloadPage || isPublicFile) {
    return NextResponse.next();
  }

  // Handle unauthenticated API calls with 401 JSON
  if (isApi && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect unauthorized or revoked user trying to access protected routes
  if (!isAuthorized && !isSignInPage && !isEnlistPage && !isDownloadPage) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    if (user?.status === "SUSPENDED") {
      signInUrl.searchParams.set("error", "AccountSuspended");
      if (user.suspendedReason) signInUrl.searchParams.set("reason", user.suspendedReason);
      if (user.suspendedDuration) signInUrl.searchParams.set("duration", user.suspendedDuration);
      if (user.suspendedUntil) signInUrl.searchParams.set("until", String(user.suspendedUntil));
    } else if (user?.isRevoked) {
      signInUrl.searchParams.set("error", "AccessRevoked");
    }
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authorized user away from sign-in page to dashboard
  if (isAuthorized && isSignInPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|webp)).*)",
  ],
};
