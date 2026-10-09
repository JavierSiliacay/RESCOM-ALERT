import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchGatewayBatchStatus } from "@/lib/sms";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");

    if (!batchId || !batchId.trim()) {
      return NextResponse.json(
        { error: "SMS Batch ID parameter ('batchId') is required." },
        { status: 400 }
      );
    }

    const telemetry = await fetchGatewayBatchStatus({
      batchId: batchId.trim(),
    });

    if (!telemetry.success) {
      return NextResponse.json(
        {
          success: false,
          error: telemetry.error || "Unable to retrieve status from gateway.",
          batchId,
          messages: [],
        },
        { status: 404 }
      );
    }

    return NextResponse.json(telemetry);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
