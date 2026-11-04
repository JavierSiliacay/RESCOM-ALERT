import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { dispatchEmergencyEmail } from "@/lib/resend";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://joyous-akita-536.convex.cloud";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { recipients, message, title, sender, priority } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    let targetEmails: string[] = [];

    // Check if recipients are already emails or mobile numbers
    if (Array.isArray(recipients) && recipients.length > 0) {
      const directEmails = recipients.filter((r: string) => r.includes("@"));
      const mobileNumbers = recipients.filter((r: string) => !r.includes("@"));

      targetEmails.push(...directEmails);

      // If mobile numbers were passed, resolve corresponding email addresses from Convex
      if (mobileNumbers.length > 0) {
        const convex = new ConvexHttpClient(convexUrl);
        const allPersonnel = await convex.query(api.personnel.list, {});
        const phoneSet = new Set(mobileNumbers.map((m: string) => m.replace(/\D/g, "").slice(-10)));

        for (const p of allPersonnel) {
          if (p.email && p.email.trim().includes("@")) {
            const rawPhone = (p.mobileNumber || "").replace(/\D/g, "").slice(-10);
            if (phoneSet.has(rawPhone)) {
              targetEmails.push(p.email.trim());
            }
          }
        }
      }
    } else {
      // If no specific recipients passed, target active iOS personnel with registered emails to protect Resend usage
      const convex = new ConvexHttpClient(convexUrl);
      const allPersonnel = await convex.query(api.personnel.list, {});
      targetEmails = allPersonnel
        .filter((p: any) => p.email && p.email.trim().includes("@") && p.status === "ACTIVE" && p.deviceType === "IOS")
        .map((p: any) => p.email.trim());
    }

    targetEmails = Array.from(new Set(targetEmails.map((e) => e.toLowerCase())));

    if (targetEmails.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        totalTargeted: 0,
        message: "No registered email addresses found for target troops.",
      });
    }

    const result = await dispatchEmergencyEmail({
      to: targetEmails,
      title: title || "10RCDG EMERGENCY ALERT",
      message: message.trim(),
      sender: sender || session.user.name || "10RCDG Tactical Command",
      priority: priority || "CRITICAL",
    });

    return NextResponse.json({
      success: result.success,
      sentCount: result.sentCount,
      totalTargeted: result.totalTargeted,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("[Email API Dispatch Error]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

