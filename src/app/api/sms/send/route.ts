import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { dispatchSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { recipients, message, title } = body;

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

    const fullMessage = title ? `[${title}]\n${message}` : message;

    const result = await dispatchSms({
      recipients,
      message: fullMessage,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
