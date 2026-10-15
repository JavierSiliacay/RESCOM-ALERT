import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { dispatchSms } from "@/lib/sms";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const callerEmail = session.user.email.toLowerCase().trim();
    if (callerEmail !== "siliacay.javier@gmail.com") {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        const convex = new ConvexHttpClient(convexUrl);
        const authCheck = await convex.query(api.access.checkByEmail, { email: callerEmail });
        if (authCheck?.user?.role === "VIEWER") {
          return NextResponse.json(
            {
              error:
                "Your role is viewer only and you're not allowed or authorize to this command, please request to the system administrators",
            },
            { status: 403 }
          );
        }
      }
    }

    const body = await req.json();
    const { recipients, message, title, simSubscriptionId } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient phone number is required" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "SMS message content cannot be empty" },
        { status: 400 }
      );
    }

    // Ensure outgoing SMS broadcasts strictly contain the official 10RCDG identifier
    let fullMessage = message.trim();
    const has10rcdg =
      fullMessage.toUpperCase().includes("10RCDG") ||
      (title && title.toUpperCase().includes("10RCDG"));

    if (title && title.trim()) {
      const cleanTitle = title.trim();
      const finalTitle = cleanTitle.toUpperCase().includes("10RCDG")
        ? cleanTitle
        : `10RCDG ${cleanTitle}`;
      fullMessage = `[${finalTitle}]\n${fullMessage}`;
    } else if (!has10rcdg) {
      fullMessage = `[10RCDG ALERT]\n${fullMessage}`;
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    let pushResult: any = null;

    // Layer 1: High-Priority FCM Push Notification Dispatch
    if (convexUrl) {
      try {
        const convex = new ConvexHttpClient(convexUrl);
        const allTroops = await convex.query(api.personnel.list);
        
        // Match recipient phone numbers to any paired troops with active fcmTokens
        const cleanRecipientSet = new Set(
          recipients.map((r: string) => r.replace(/\D/g, "").slice(-10))
        );

        const pushTokens: string[] = [];
        allTroops.forEach((t: any) => {
          const tDigits = (t.mobileNumber || "").replace(/\D/g, "").slice(-10);
          if (cleanRecipientSet.has(tDigits) && t.fcmToken && t.appDeviceId) {
            pushTokens.push(t.fcmToken);
          }
        });

        if (pushTokens.length > 0) {
          const { dispatchFcmAlert } = await import("@/lib/fcm");
          pushResult = await dispatchFcmAlert({
            tokens: pushTokens,
            title: title ? `10RCDG: ${title}` : "10RCDG EMERGENCY ALERT",
            body: message.trim(),
            sender: "10RCDG Tactical HQ",
            siren: true,
          });
        }
      } catch (pushErr) {
        console.error("FCM push broadcast dispatch failed (proceeding with SMS):", pushErr);
      }
    }

    const result = await dispatchSms({
      recipients,
      message: fullMessage,
      simSubscriptionId,
    });

    return NextResponse.json({
      ...result,
      pushResult,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
