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
 * Generate a clean, non-technical, human-friendly HTML email template for 10RCDG troop advisories and alerts
 */
export function buildEmergencyEmailHtml(payload: EmergencyAlertEmailPayload): string {
  // Strip any raw developer/tech jargon like "(iOS Layer)", "(iOS)", "(Layer 3)", "(Resend)"
  const rawTitle = payload.title || "Official Command Advisory";
  const cleanTitle = rawTitle.replace(/\s*\((ios|email|layer|resend)[^)]*\)/gi, "").trim();

  const priority = payload.priority || "CRITICAL";
  const senderName = payload.sender || "10RCDG Command Headquarters";
  const unitName = payload.unit || "10th Regional Community Defense Group";
  const soldierGreeting = payload.soldierName
    ? `ATTENTION: ${payload.soldierName.toUpperCase()}`
    : "ATTENTION: ALL 10RCDG RESERVIST TROOPS";

  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const badgeConfig =
    priority === "CRITICAL"
      ? {
          label: "🚨 URGENT MOBILIZATION ORDER",
          color: "#991b1b",
          bg: "#fef2f2",
          border: "#fecaca",
          accentBar: "#dc2626",
        }
      : priority === "HIGH"
      ? {
          label: "⚠️ PRIORITY NOTICE",
          color: "#92400e",
          bg: "#fffbeb",
          border: "#fde68a",
          accentBar: "#f59e0b",
        }
      : {
          label: "📢 TROOP ADVISORY",
          color: "#065f46",
          bg: "#ecfdf5",
          border: "#a7f3d0",
          accentBar: "#10b981",
        };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 24px 12px;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.07);
      border: 1px solid #e2e8f0;
    }
    .accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #d97706, #fbbf24, #d97706);
    }
    .header {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
      color: #ffffff;
      padding: 24px 22px 20px;
      text-align: left;
    }
    .org-badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #fef08a;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .title {
      font-size: 21px;
      font-weight: 800;
      line-height: 1.3;
      margin: 12px 0 4px;
      color: #ffffff;
    }
    .subtitle {
      font-size: 12px;
      color: #a7f3d0;
      margin: 0;
      font-weight: 500;
    }
    .body-content {
      padding: 26px 22px;
      color: #1e293b;
    }
    .priority-badge {
      display: inline-block;
      padding: 5px 12px;
      font-size: 11px;
      font-weight: 800;
      border-radius: 9999px;
      background-color: ${badgeConfig.bg};
      color: ${badgeConfig.color};
      border: 1px solid ${badgeConfig.border};
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .greeting {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .intro {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 16px;
      line-height: 1.5;
    }
    .message-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #059669;
      border-radius: 10px;
      padding: 18px 18px;
      margin: 16px 0 20px;
      font-size: 15px;
      line-height: 1.65;
      color: #1e293b;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-size: 13px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .details-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .details-table td.label {
      font-weight: 600;
      color: #64748b;
      width: 35%;
    }
    .details-table td.value {
      font-weight: 600;
      color: #0f172a;
    }
    .cta-container {
      text-align: center;
      margin: 26px 0 12px;
    }
    .cta-button {
      display: inline-block;
      background-color: #065f46;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      padding: 13px 26px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(6, 95, 70, 0.25);
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 22px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 11px;
      line-height: 1.5;
    }
    .footer strong {
      color: #1e293b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="accent-bar"></div>
    <div class="header">
      <div class="org-badge">PHILIPPINE ARMY • 10RCDG RESERVE COMMAND</div>
      <div class="title">${cleanTitle}</div>
      <div class="subtitle">Citizen Armed Forces • Operational Advisory</div>
    </div>
    
    <div class="body-content">
      <div class="priority-badge">${badgeConfig.label}</div>
      <div class="greeting">${soldierGreeting}</div>
      <div class="intro">
        You have received an official notification from your Command Headquarters:
      </div>

      <div class="message-box">
${payload.message}
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Dispatched By:</td>
          <td class="value">${senderName}</td>
        </tr>
        <tr>
          <td class="label">Date & Time:</td>
          <td class="value">${timestamp} PHT</td>
        </tr>
        <tr>
          <td class="label">Assigned Unit:</td>
          <td class="value">${unitName}</td>
        </tr>
      </table>

      <div class="cta-container">
        <a href="https://rescom-alert.site" class="cta-button" target="_blank">
          📱 Open Command Portal & Confirm Receipt &rarr;
        </a>
      </div>
    </div>

    <div class="footer">
      <strong>HEADQUARTERS 10TH REGIONAL COMMUNITY DEFENSE GROUP</strong><br>
      Reserve Command, Philippine Army • Camp R.T. Morgan, Cagayan de Oro City<br>
      <span style="display: inline-block; margin-top: 8px; color: #94a3b8;">
        For inquiries, please coordinate directly with your CDC Administrative Officer or Unit Commander.<br>
        Serving with Honor, Duty, and Patriotism.
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

  const rawSubject = payload.title || "Official Mobilization Notice";
  const cleanSubject = rawSubject.replace(/\s*\((ios|email|layer|resend)[^)]*\)/gi, "").trim();
  const subject = `[10RCDG] ${cleanSubject}`;

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

/**
 * Dispatch an official 10RCDG Security Login Code (OTP) via Resend
 */
export async function sendOtpEmail({
  to,
  code,
  officerName,
}: {
  to: string;
  code: string;
  officerName?: string;
}) {
  if (!resend) {
    throw new Error("Resend is not initialized. Please configure RESEND_API_KEY.");
  }

  const cleanRecipient = to.toLowerCase().trim();
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
  const subject = `[10RCDG] Security Login Code: ${formattedCode}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>10RCDG Login Code</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Banner -->
    <div style="background-color: #064e3b; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
      <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
        10th Regional Community Defense Group
      </h1>
      <p style="margin: 4px 0 0 0; color: #a7f3d0; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
        Philippine Army Reserve Command
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 24px; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
        Officer Security Verification
      </p>
      
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #1e293b; line-height: 1.5;">
        ${officerName ? `Hello <strong>${officerName}</strong>,<br>` : ""}Use this official 6-digit code to sign in to the 10RCDG RESCOM Command Portal:
      </p>

      <!-- 6-Digit Code Display Box -->
      <div style="display: inline-block; background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 16px 28px; margin: 0 auto 24px auto;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #14532d;">
          ${code}
        </span>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b;">
        ⏱️ This code will expire in <strong>5 minutes</strong>.
      </p>

      <!-- Security Guidance Notice -->
      <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 12px 16px; text-align: left; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 11px; color: #854d0e; line-height: 1.5;">
          <strong>Security Notice:</strong> Never share this code with anyone. 10RCDG Command Staff will never ask for your security code via text message, phone call, or email.
        </p>
      </div>

      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        If you did not request this login code, you can safely ignore this email. Someone may have entered your email by mistake.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #f1f5f9;">
      <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 500;">
        10RCDG RESCOM ALERT • Official Military Notification System
      </p>
      <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8;">
        Camp Evangelista, Cagayan de Oro City, Misamis Oriental
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();

  const result = await resend.emails.send({
    from: DEFAULT_FROM_EMAIL,
    to: cleanRecipient,
    subject,
    html,
  });

  return {
    success: Boolean(result.data?.id),
    id: result.data?.id,
    error: result.error,
  };
}

