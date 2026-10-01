export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  totalRecipients: number;
  successfulRecipients: string[];
  failedRecipients: string[];
  error?: string;
  mode: "LIVE" | "SIMULATION";
}

export interface SmsGatewayConfig {
  apiKey: string;
  deviceId: string;
  senderPrefix: string;
  status: "ONLINE" | "STANDBY" | "OFFLINE";
  phoneModel: string;
  batteryLevel: number;
  simCarrier: string;
}

export const DEFAULT_GATEWAY_CONFIG: SmsGatewayConfig = {
  apiKey: process.env.NEXT_PUBLIC_TEXTBEE_API_KEY || "",
  deviceId: process.env.NEXT_PUBLIC_TEXTBEE_DEVICE_ID || "",
  senderPrefix: "[10RCDG ALERT]",
  status: "ONLINE",
  phoneModel: "Samsung Galaxy A15 (10RCDG Gateway #1)",
  batteryLevel: 94,
  simCarrier: "SMART Communications (PH)",
};

/**
 * Dispatches an SMS message using the TextBee API gateway or simulation fallback.
 */
export async function dispatchSms({
  recipients,
  message,
  apiKey,
  deviceId,
}: {
  recipients: string[];
  message: string;
  apiKey?: string;
  deviceId?: string;
}): Promise<SmsSendResult> {
  const activeApiKey = apiKey || process.env.TEXTBEE_API_KEY || process.env.NEXT_PUBLIC_TEXTBEE_API_KEY;
  const activeDeviceId = deviceId || process.env.TEXTBEE_DEVICE_ID || process.env.NEXT_PUBLIC_TEXTBEE_DEVICE_ID;

  // Format Philippine mobile numbers
  const formattedRecipients = recipients.map((num) => {
    let clean = num.replace(/\s+/g, "").replace(/-/g, "");
    if (clean.startsWith("09")) {
      clean = "+63" + clean.substring(1);
    } else if (clean.startsWith("9")) {
      clean = "+63" + clean;
    }
    return clean;
  });

  // If live credentials are provided, call TextBee API
  if (activeApiKey && activeDeviceId) {
    try {
      const response = await fetch(
        `https://api.textbee.dev/api/v1/gateway/devices/${activeDeviceId}/send-sms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": activeApiKey,
          },
          body: JSON.stringify({
            recipients: formattedRecipients,
            message: message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          totalRecipients: formattedRecipients.length,
          successfulRecipients: [],
          failedRecipients: formattedRecipients,
          error: data.message || "Failed to dispatch SMS via TextBee Gateway.",
          mode: "LIVE",
        };
      }

      return {
        success: true,
        messageId: data.data?.batchId || `TXB-${Date.now()}`,
        totalRecipients: formattedRecipients.length,
        successfulRecipients: formattedRecipients,
        failedRecipients: [],
        mode: "LIVE",
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Network error during SMS gateway transmission";
      return {
        success: false,
        totalRecipients: formattedRecipients.length,
        successfulRecipients: [],
        failedRecipients: formattedRecipients,
        error: errorMessage,
        mode: "LIVE",
      };
    }
  }

  // Simulation Fallback
  return {
    success: true,
    messageId: `SIM-${Date.now()}`,
    totalRecipients: formattedRecipients.length,
    successfulRecipients: formattedRecipients,
    failedRecipients: [],
    mode: "SIMULATION",
  };
}
