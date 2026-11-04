import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;
export const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "10RCDG RESCOM <alerts@rescom-alert.site>";

export interface EmergencyAlertEmailPayload {
  to: string | string[];
  title?: string;
  message: string;
  sender?: string;
  priority?: "CRITICAL" | "HIGH" | "ROUTINE";
  soldierName?: string;
  unit?: string;
}

/**
 * Generate a high-contrast, military-grade HTML email template for 10RCDG emergency dispatches
 */
export function buildEmergencyEmailHtml(payload: EmergencyAlertEmailPayload): string {
  const title = payload.title ? payload.title.toUpperCase() : "10RCDG EMERGENCY ALERT";
  const priority = payload.priority || "CRITICAL";
  const sender = payload.sender || "10RCDG Tactical Command HQ";
  const soldierGreeting = payload.soldierName ? `ATTN: ${payload.soldierName.toUpperCase()}` : "ATTN: ALL 10RCDG RESERVIST TROOPS";
  const unit = payload.unit || "10RCDG RESERVE COMMAND, PHILIPPINE ARMY";
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const priorityColor = priority === "CRITICAL" ? "#dc2626" : priority === "HIGH" ? "#d97706" : "#059669";
  const priorityBg = priority === "CRITICAL" ? "#fef2f2" : priority === "HIGH" ? "#fffbeb" : "#ecfdf5";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px 10px; }
    .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #1b3d2f 0%, #064e3b 100%); color: #ffffff; padding: 24px 20px; text-align: center; border-bottom: 4px solid #10b981; }
    .badge { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 9999px; background-color: ${priorityBg}; color: ${priorityColor}; border: 1px solid ${priorityColor}; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.3; margin: 8px 0 0; color: #ffffff; }
    .subtitle { font-size: 11px; color: #a7f3d0; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 6px; font-weight: 600; }
    .body-content { padding: 28px 24px; color: #1e293b; font-size: 15px; line-height: 1.6; }
    .alert-box { background-color: #f8fafc; border-left: 5px solid #064e3b; border-radius: 0 8px 8px 0; padding: 18px 20px; margin: 18px 0; font-size: 16px; font-weight: 500; color: #0f172a; white-space: pre-wrap; word-break: break-word; }
    .meta-table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; background-color: #f1f5f9; border-radius: 8px; }
    .meta-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
    .meta-table td.label { font-weight: 700; color: #475569; width: 35%; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-table td.val { font-weight: 600; color: #0f172a; }
    .footer { background-color: #0b1329; color: #94a3b8; padding: 20px; text-align: center; font-size: 11px; line-height: 1.5; border-top: 1px solid #1e293b; }
    .footer strong { color: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">${priority} PRIORITY // 10RCDG RESCOM</div>
      <div class="title">🚨 ${title}</div>
      <div class="subtitle">${unit}</div>
    </div>
    
    <div class="body-content">
      <p style="margin: 0 0 14px; font-size: 13px; font-weight: 700; color: #064e3b; letter-spacing: 0.8px;">${soldierGreeting}</p>
      
      <p style="margin: 0 0 12px; font-size: 14px; color: #334155;">
        You have received an official emergency mobilization and operational dispatch from Command Headquarters:
      </p>

      <div class="alert-box">
${payload.message}
      </div>

      <table class="meta-table">
        <tr>
          <td class="label">Dispatched By:</td>
          <td class="val">${sender}</td>
        </tr>
        <tr>
          <td class="label">Timestamp:</td>
          <td class="val">${timestamp} PHT</td>
        </tr>
        <tr>
          <td class="label">Channel:</td>
          <td class="val">Resend iOS/Email Emergency Layer</td>
        </tr>
        <tr>
          <td class="label">Security Level:</td>
          <td class="val">RESTRICTED - OFFICIAL 10RCDG USE ONLY</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <strong>HEADQUARTERS 10TH REGIONAL COMMUNITY DEFENSE GROUP</strong><br>
      Reserve Command, Philippine Army • Camp R.T. Morgan, Cagayan de Oro City<br>
      <span style="font-size: 10px; color: #64748b; margin-top: 8px; display: inline-block;">
        This is an automated operational defense dispatch. Do not reply directly to this email address.
      </span>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatch an Emergency Alert email using Resend
 */
export async function dispatchEmergencyEmail(payload: EmergencyAlertEmailPayload) {
  if (!resend) {
    throw new Error("Resend is not initialized. Please configure RESEND_API_KEY.");
  }

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const validRecipients = recipients
    .map((e) => e.trim())
    .filter((e) => e.includes("@") && e.includes("."));

  if (validRecipients.length === 0) {
    return { success: false, sentCount: 0, reason: "No valid recipient emails" };
  }

  const subject = payload.title
    ? `🚨 10RCDG ALERT: ${payload.title}`
    : "🚨 10RCDG EMERGENCY MOBILIZATION ALERT";

  const html = buildEmergencyEmailHtml(payload);

  // Send batch or single email
  // Resend supports sending up to 100 emails in a single batch request
  const BATCH_SIZE = 100;
  let totalSent = 0;
  const errors: any[] = [];

  for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
    const chunk = validRecipients.slice(i, i + BATCH_SIZE);
    try {
      if (chunk.length === 1) {
        const res = await resend.emails.send({
          from: DEFAULT_FROM_EMAIL,
          to: chunk[0],
          subject,
          html,
        });
        if (res.data?.id) totalSent++;
        if (res.error) errors.push(res.error);
      } else {
        const batchPayload = chunk.map((toEmail) => ({
          from: DEFAULT_FROM_EMAIL,
          to: toEmail,
          subject,
          html,
        }));
        const res = await resend.batch.send(batchPayload);
        if (res.data?.data) {
          totalSent += res.data.data.length;
        }
        if (res.error) errors.push(res.error);
      }
    } catch (err: any) {
      errors.push(err.message || err);
    }
  }

  return {
    success: totalSent > 0,
    sentCount: totalSent,
    totalTargeted: validRecipients.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}
