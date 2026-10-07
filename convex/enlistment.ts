import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { calculateSuspensionExpiry } from "./access";

// Helper to generate a clean, readable campaign slug code (e.g. "1001-muster-8N2K")
function generateCampaignCode(title: string): string {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanTitle || "enlist"}-${randomChars}`;
}

// 1. Create a new Enlistment Campaign
export const createCampaign = mutation({
  args: {
    title: v.string(),
    instructions: v.optional(v.string()),
    passcode: v.string(),
    targetUnit: v.optional(v.string()),
    groupId: v.optional(v.string()),
    groupName: v.string(),
    durationStr: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanPasscode = args.passcode.trim().toUpperCase();
    if (!cleanPasscode) {
      throw new Error("A secure unit passcode is required.");
    }

    // Calculate expiry timestamp
    const now = Date.now();
    let expiresAt = calculateSuspensionExpiry(args.durationStr);
    if (!expiresAt || isNaN(expiresAt)) {
      // Default to 24 hours if duration is unrecognized or indefinite
      expiresAt = now + 24 * 60 * 60 * 1000;
    }

    const campaignCode = generateCampaignCode(args.title);
    const targetUnit = args.targetUnit?.trim() || args.groupName || "All Units";

    const campaignId = await ctx.db.insert("enlistmentCampaigns", {
      campaignCode,
      title: args.title.trim(),
      instructions: args.instructions?.trim() || undefined,
      passcode: cleanPasscode,
      targetUnit,
      groupId: args.groupId,
      groupName: args.groupName.trim() || "All 10RCDG Personnel",
      expiresAt,
      duration: args.durationStr.trim(),
      status: "ACTIVE",
      createdBy: args.createdBy,
      createdAt: new Date().toISOString(),
    });

    return {
      campaignId,
      campaignCode,
      expiresAt,
    };
  },
});

// 2. List all Campaigns (For Commander / S3 Dashboard)
export const listCampaigns = query({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("enlistmentCampaigns").order("desc").collect();
    const submissions = await ctx.db.query("enlistmentSubmissions").collect();
    const now = Date.now();

    return campaigns.map((c) => {
      const campSubs = submissions.filter((s) => s.campaignId === c._id);
      const pendingCount = campSubs.filter((s) => s.status === "PENDING").length;
      const approvedCount = campSubs.filter((s) => s.status === "APPROVED").length;
      const isExpired = now >= c.expiresAt || c.status === "CLOSED";

      return {
        ...c,
        totalSubmissions: campSubs.length,
        pendingCount,
        approvedCount,
        isExpired,
      };
    });
  },
});

// 3. Get Public Campaign Details by Code (For Public Soldier Registration)
export const getCampaignPublic = query({
  args: { campaignCode: v.string() },
  handler: async (ctx, args) => {
    const cleanCode = args.campaignCode.toLowerCase().trim();
    const allCampaigns = await ctx.db.query("enlistmentCampaigns").collect();
    const campaign = allCampaigns.find((c) => c.campaignCode.toLowerCase() === cleanCode);

    if (!campaign) {
      return null;
    }

    const now = Date.now();
    const isExpired = now >= campaign.expiresAt || campaign.status === "CLOSED";

    return {
      _id: campaign._id,
      campaignCode: campaign.campaignCode,
      title: campaign.title,
      instructions: campaign.instructions,
      targetUnit: campaign.targetUnit,
      groupName: campaign.groupName,
      groupId: campaign.groupId,
      expiresAt: campaign.expiresAt,
      duration: campaign.duration,
      status: campaign.status,
      isExpired,
    };
  },
});

// 4. Verify Passcode (Public check query)
export const verifyPasscode = query({
  args: {
    campaignCode: v.string(),
    passcode: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanCode = args.campaignCode.toLowerCase().trim();
    const allCampaigns = await ctx.db.query("enlistmentCampaigns").collect();
    const campaign = allCampaigns.find((c) => c.campaignCode.toLowerCase() === cleanCode);

    if (!campaign) {
      return { valid: false, message: "Enlistment campaign not found." };
    }

    if (Date.now() >= campaign.expiresAt || campaign.status === "CLOSED") {
      return { valid: false, message: "Enlistment window has closed." };
    }

    const isMatch = campaign.passcode.trim().toUpperCase() === args.passcode.trim().toUpperCase();
    return {
      valid: isMatch,
      message: isMatch ? "Passcode accepted." : "Incorrect unit security passcode. Entry denied.",
    };
  },
});

// 4b. Validate Passcode Mutation (for immediate upfront unlock verification)
export const validatePasscode = mutation({
  args: {
    campaignCode: v.string(),
    passcode: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanCode = args.campaignCode.toLowerCase().trim();
    const allCampaigns = await ctx.db.query("enlistmentCampaigns").collect();
    const campaign = allCampaigns.find((c) => c.campaignCode.toLowerCase() === cleanCode);

    if (!campaign) {
      return { valid: false, message: "Enlistment campaign not found." };
    }

    if (Date.now() >= campaign.expiresAt || campaign.status === "CLOSED") {
      return { valid: false, message: "This enlistment window has already closed." };
    }

    const isMatch = campaign.passcode.trim().toUpperCase() === args.passcode.trim().toUpperCase();
    return {
      valid: isMatch,
      message: isMatch ? "Passcode accepted." : "Incorrect unit security passcode. Entry denied.",
    };
  },
});

// 5. Submit Official Enlistment (From Public Portal)
export const submitEnlistment = mutation({
  args: {
    campaignCode: v.string(),
    passcode: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    rank: v.string(),
    mobileNumber: v.string(),
    unit: v.string(),
    groupId: v.optional(v.string()),
    groupName: v.string(),
    email: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanCode = args.campaignCode.toLowerCase().trim();
    const allCampaigns = await ctx.db.query("enlistmentCampaigns").collect();
    const campaign = allCampaigns.find((c) => c.campaignCode.toLowerCase() === cleanCode);

    if (!campaign) {
      throw new ConvexError("Invalid or non-existent enlistment campaign.");
    }

    if (Date.now() >= campaign.expiresAt || campaign.status === "CLOSED") {
      throw new ConvexError("This enlistment registration window has closed.");
    }

    if (campaign.passcode.trim().toUpperCase() !== args.passcode.trim().toUpperCase()) {
      throw new ConvexError("Invalid unit passcode. Entry denied.");
    }

    // Standardize to canonical +639XXXXXXXXX
    const rawDigits = args.mobileNumber.replace(/\D/g, "");
    let cleanMobile = "";
    if (rawDigits.startsWith("639") && rawDigits.length === 12) {
      cleanMobile = "+63" + rawDigits.slice(2);
    } else if (rawDigits.startsWith("09") && rawDigits.length === 11) {
      cleanMobile = "+63" + rawDigits.slice(1);
    } else if (rawDigits.startsWith("9") && rawDigits.length === 10) {
      cleanMobile = "+63" + rawDigits;
    } else {
      cleanMobile = "+63" + rawDigits;
    }

    const normalizePh = (numStr: string) => {
      const digits = (numStr || "").replace(/\D/g, "");
      if (digits.startsWith("639") && digits.length === 12) return "+63" + digits.slice(2);
      if (digits.startsWith("09") && digits.length === 11) return "+63" + digits.slice(1);
      if (digits.startsWith("9") && digits.length === 10) return "+63" + digits;
      return "+" + digits;
    };

    // 1. Check if number already exists in active personnel directory
    const allPersonnel = await ctx.db.query("personnel").collect();
    const existingPersonnel = allPersonnel.find((p) => normalizePh(p.mobileNumber) === cleanMobile);
    if (existingPersonnel) {
      throw new ConvexError(
        `This mobile number (${cleanMobile}) is already registered in the official personnel directory as ${existingPersonnel.rank} ${existingPersonnel.firstName} ${existingPersonnel.lastName}.`
      );
    }

    // 2. Check if number already exists across enlistment submissions (pending or approved)
    const allSubmissions = await ctx.db.query("enlistmentSubmissions").collect();
    const existingSubmission = allSubmissions.find(
      (s) => s.status !== "REJECTED" && normalizePh(s.mobileNumber) === cleanMobile
    );

    if (existingSubmission) {
      throw new ConvexError(
        `This mobile number (${cleanMobile}) has already submitted registration in batch "${existingSubmission.campaignCode}". Multiple registrations with the same phone number are not permitted.`
      );
    }

    const submissionId = await ctx.db.insert("enlistmentSubmissions", {
      campaignId: campaign._id,
      campaignCode: campaign.campaignCode,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      rank: args.rank.trim(),
      mobileNumber: cleanMobile,
      unit: args.unit.trim() || campaign.targetUnit,
      groupId: args.groupId || campaign.groupId,
      groupName: args.groupName.trim() || campaign.groupName,
      email: args.email?.trim() || undefined,
      serialNumber: args.serialNumber?.trim() || undefined,
      status: "PENDING",
      submittedAt: new Date().toISOString(),
    });

    return { success: true, submissionId };
  },
});

// 6. List Submissions for Command Review
export const listSubmissions = query({
  args: {
    campaignId: v.optional(v.id("enlistmentCampaigns")),
  },
  handler: async (ctx, args) => {
    let submissions = await ctx.db.query("enlistmentSubmissions").order("desc").collect();
    if (args.campaignId) {
      submissions = submissions.filter((s) => s.campaignId === args.campaignId);
    }
    return submissions;
  },
});

// 7. Approve Single Enlistment Submission (Adds to Personnel Table)
export const approveSubmission = mutation({
  args: {
    submissionId: v.id("enlistmentSubmissions"),
    reviewerEmail: v.string(),
    reviewerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new Error("Submission not found.");

    const approverName = args.reviewerName || args.reviewerEmail || "Authorized Officer";
    const updateTimestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Update submission status
    await ctx.db.patch(args.submissionId, {
      status: "APPROVED",
      reviewedAt: new Date().toISOString(),
      reviewedBy: approverName,
    });

    // Check if soldier already exists in personnel roster
    const allPersonnel = await ctx.db.query("personnel").collect();
    const existing = allPersonnel.find((p) => p.mobileNumber === sub.mobileNumber);

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        firstName: sub.firstName,
        lastName: sub.lastName,
        rank: sub.rank,
        unit: sub.unit,
        groupName: sub.groupName,
        groupId: sub.groupId,
        status: "ACTIVE",
        email: sub.email || existing.email,
        updatedBy: approverName,
        updatedAt: updateTimestamp,
      });
    } else {
      // Insert new personnel
      await ctx.db.insert("personnel", {
        firstName: sub.firstName,
        lastName: sub.lastName,
        rank: sub.rank,
        mobileNumber: sub.mobileNumber,
        unit: sub.unit,
        groupId: sub.groupId,
        groupName: sub.groupName,
        status: "ACTIVE",
        email: sub.email,
        createdAt: new Date().toISOString().split("T")[0],
        createdBy: approverName,
      });
    }

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: approverName,
      userRole: "ADMIN",
      category: "PERSONNEL",
      action: "APPROVE_ENLISTMENT",
      details: `Approved enlistment self-registration for ${sub.rank} ${sub.firstName} ${sub.lastName} (${sub.mobileNumber}) into ${sub.groupName}`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });

    return { success: true };
  },
});

// 8. Bulk Approve Submissions
export const bulkApproveSubmissions = mutation({
  args: {
    submissionIds: v.array(v.id("enlistmentSubmissions")),
    reviewerEmail: v.string(),
    reviewerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const approverName = args.reviewerName || args.reviewerEmail || "Authorized Officer";
    const updateTimestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const allPersonnel = await ctx.db.query("personnel").collect();
    const nowStr = new Date().toISOString();
    let approvedCount = 0;

    for (const subId of args.submissionIds) {
      const sub = await ctx.db.get(subId);
      if (!sub || sub.status === "APPROVED") continue;

      await ctx.db.patch(subId, {
        status: "APPROVED",
        reviewedAt: nowStr,
        reviewedBy: approverName,
      });

      const existing = allPersonnel.find((p) => p.mobileNumber === sub.mobileNumber);
      if (existing) {
        await ctx.db.patch(existing._id, {
          firstName: sub.firstName,
          lastName: sub.lastName,
          rank: sub.rank,
          unit: sub.unit,
          groupName: sub.groupName,
          groupId: sub.groupId,
          status: "ACTIVE",
          email: sub.email || existing.email,
          updatedBy: approverName,
          updatedAt: updateTimestamp,
        });
      } else {
        await ctx.db.insert("personnel", {
          firstName: sub.firstName,
          lastName: sub.lastName,
          rank: sub.rank,
          mobileNumber: sub.mobileNumber,
          unit: sub.unit,
          groupId: sub.groupId,
          groupName: sub.groupName,
          status: "ACTIVE",
          email: sub.email,
          createdAt: nowStr.split("T")[0],
          createdBy: approverName,
        });
      }
      approvedCount++;
    }

    if (approvedCount > 0) {
      await ctx.db.insert("auditLogs", {
        userName: approverName,
        userRole: "ADMIN",
        category: "PERSONNEL",
        action: "BULK_APPROVE_ENLISTMENT",
        details: `Bulk approved ${approvedCount} enlistment submission(s) into active directory`,
        ipAddress: "127.0.0.1",
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      });
    }

    return { success: true, approvedCount };
  },
});

// 9. Reject Submission
export const rejectSubmission = mutation({
  args: {
    submissionId: v.id("enlistmentSubmissions"),
    reviewerEmail: v.string(),
    reviewerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = args.reviewerName || args.reviewerEmail || "Authorized Officer";
    await ctx.db.patch(args.submissionId, {
      status: "REJECTED",
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer,
    });
    return { success: true };
  },
});

// 10. Close / Invalidate Campaign Early
export const closeCampaign = mutation({
  args: { campaignId: v.id("enlistmentCampaigns") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      status: "CLOSED",
    });
    return { success: true };
  },
});

// 11. Delete Campaign
export const removeCampaign = mutation({
  args: { campaignId: v.id("enlistmentCampaigns") },
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("enlistmentSubmissions")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const sub of subs) {
      await ctx.db.delete(sub._id);
    }
    await ctx.db.delete(args.campaignId);
    return { success: true };
  },
});
