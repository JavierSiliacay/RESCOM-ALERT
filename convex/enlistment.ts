import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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

// 4. Verify Passcode (Public check)
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
      message: isMatch ? "Passcode accepted." : "Incorrect unit passcode. Please check with your Adjutant.",
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
      throw new Error("Invalid or non-existent enlistment campaign.");
    }

    if (Date.now() >= campaign.expiresAt || campaign.status === "CLOSED") {
      throw new Error("This enlistment registration window has closed.");
    }

    if (campaign.passcode.trim().toUpperCase() !== args.passcode.trim().toUpperCase()) {
      throw new Error("Invalid unit passcode. Entry denied.");
    }

    // Format mobile number to clean +639 format
    let cleanMobile = args.mobileNumber.replace(/[^0-9+]/g, "");
    if (cleanMobile.startsWith("09") && cleanMobile.length === 11) {
      cleanMobile = "+63" + cleanMobile.slice(1);
    } else if (cleanMobile.startsWith("9") && cleanMobile.length === 10) {
      cleanMobile = "+63" + cleanMobile;
    } else if (cleanMobile.startsWith("639") && cleanMobile.length === 12) {
      cleanMobile = "+" + cleanMobile;
    }

    // Check duplicate in same campaign
    const existingSubmissions = await ctx.db
      .query("enlistmentSubmissions")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaign._id))
      .collect();

    const isDuplicate = existingSubmissions.some(
      (s) => s.mobileNumber === cleanMobile ||
        (s.firstName.toLowerCase() === args.firstName.trim().toLowerCase() &&
         s.lastName.toLowerCase() === args.lastName.trim().toLowerCase())
    );

    if (isDuplicate) {
      throw new Error("You have already submitted an enlistment registration for this campaign.");
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
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new Error("Submission not found.");

    // Update submission status
    await ctx.db.patch(args.submissionId, {
      status: "APPROVED",
      reviewedAt: new Date().toISOString(),
      reviewedBy: args.reviewerEmail,
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
        createdAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

// 8. Bulk Approve Submissions
export const bulkApproveSubmissions = mutation({
  args: {
    submissionIds: v.array(v.id("enlistmentSubmissions")),
    reviewerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const allPersonnel = await ctx.db.query("personnel").collect();
    const nowStr = new Date().toISOString();
    let approvedCount = 0;

    for (const subId of args.submissionIds) {
      const sub = await ctx.db.get(subId);
      if (!sub || sub.status === "APPROVED") continue;

      await ctx.db.patch(subId, {
        status: "APPROVED",
        reviewedAt: nowStr,
        reviewedBy: args.reviewerEmail,
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
          createdAt: nowStr,
        });
      }
      approvedCount++;
    }

    return { success: true, approvedCount };
  },
});

// 9. Reject Submission
export const rejectSubmission = mutation({
  args: {
    submissionId: v.id("enlistmentSubmissions"),
    reviewerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      status: "REJECTED",
      reviewedAt: new Date().toISOString(),
      reviewedBy: args.reviewerEmail,
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
