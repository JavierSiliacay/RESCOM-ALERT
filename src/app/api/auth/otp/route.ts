import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { sendOtpEmail } from "@/lib/resend";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();

    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!convexUrl) {
      return NextResponse.json(
        { success: false, message: "Server database configuration error." },
        { status: 500 }
      );
    }

    // Capture IP address for security audit
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const convex = new ConvexHttpClient(convexUrl);

    // 1. Prepare OTP in Convex: Enforces Roster check, 60s cooldown, and SHA-256 hash
    const result = await convex.mutation(api.authOtp.prepareOtp, {
      email,
      ipAddress: ip,
    });

    if (!result.success || !result.plainCode) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          remainingSeconds: result.remainingSeconds,
          message: result.message || "Failed to generate security code.",
        },
        { status: result.error === "COOLDOWN" ? 429 : 403 }
      );
    }

    // 2. Dispatch official email via Resend (zero plaintext code is ever returned to client)
    const sendResult = await sendOtpEmail({
      to: email,
      code: result.plainCode,
      officerName: result.officerName,
    });

    if (!sendResult.success) {
      console.error("Resend OTP dispatch failed:", sendResult.error);
      return NextResponse.json(
        {
          success: false,
          message: "Unable to dispatch email. Please verify your email or contact technical support.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Security code sent to ${email}.`,
    });
  } catch (err: any) {
    console.error("Auth OTP endpoint error:", err);
    return NextResponse.json(
      { success: false, message: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

