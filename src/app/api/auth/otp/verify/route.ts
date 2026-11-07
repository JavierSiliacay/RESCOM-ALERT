import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();
    const code = (body?.code || "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: "Email and 6-digit code are required." },
        { status: 400 }
      );
    }

    if (!convexUrl) {
      return NextResponse.json(
        { success: false, message: "Database service configuration error." },
        { status: 500 }
      );
    }

    const convex = new ConvexHttpClient(convexUrl);

    // Direct OTP verification against Convex (Always decrements attempts reliably)
    const result = await convex.mutation(api.authOtp.verifyAndBurnOtp, {
      email,
      code,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Direct OTP verification API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "An unexpected error occurred during code verification.",
      },
      { status: 500 }
    );
  }
}

