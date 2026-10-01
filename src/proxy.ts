import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isSignInPage = req.nextUrl.pathname.startsWith("/sign-in");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
  const isApi = req.nextUrl.pathname.startsWith("/api");

  if (isAuthApi) {
    return NextResponse.next();
  }

  // Handle unauthenticated API calls with 401 JSON
  if (isApi && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect unauthenticated user trying to access protected routes
  if (!isLoggedIn && !isSignInPage) {
    return NextResponse.redirect(new URL("/sign-in", req.nextUrl.origin));
  }

  // Redirect authenticated user away from sign-in page to dashboard
  if (isLoggedIn && isSignInPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|webp)).*)",
  ],
};
