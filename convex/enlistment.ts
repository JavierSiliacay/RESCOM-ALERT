import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { calculateSuspensionExpiry, assertCallerAuthorized } from "./access";
import { adjustGroupMemberCount } from "./groups";

// Helper to atomically adjust cached counts on enlistmentCampaigns
export async function adjustCampaignCounts(
  ctx: any,
  campaignId: any,
  delta: { total?: number; pending?: number; approved?: number }
) {
  if (!campaignId) return;
  try {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) return;

    const patch: Record<string, number> = {};
    if (delta.total !== undefined) {
      patch.totalSubmissions = Math.max(0, (campaign.totalSubmissions ?? 0) + delta.total);
    }
    if (delta.pending !== undefined) {
      patch.pendingCount = Math.max(0, (campaign.pendingCount ?? 0) + delta.pending);
    }
    if (delta.approved !== undefined) {
      patch.approvedCount = Math.max(0, (campaign.approvedCount ?? 0) + delta.approved);
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(campaign._id, patch);
    }
  } catch (err) {
    console.error("Failed to adjust campaign counts:", err);
  }
}

// Helper: Normalize Philippine mobile number core 10 digits (e.g. 9XXXXXXXXX)
function normalizePhMobile(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("6309")) return digits.slice(3); // 9XXXXXXXXX
  if (digits.startsWith("639")) return digits.slice(2);  // 9XXXXXXXXX
  if (digits.startsWith("09")) return digits.slice(1);   // 9XXXXXXXXX
  if (digits.startsWith("9") && digits.length === 10) return digits;
  if (digits.length >= 10 && digits.slice(-10).startsWith("9")) {
    return digits.slice(-10);
  }
  return digits;
}

export const VALID_TRAINING_CATEGORIES = [
  "BCMT",
  "BASIC ROTC",
  "ADVANCE ROTC",
  "POTC GRADUATE",
  "COMMISSION UNDER RA2334",
];

export function validateReservistFields(args: {
  age?: number;
  yearGraduated?: string;
  trainingCategory?: string;
  school?: string;
  currentAddress?: string;
  skills?: string;
  currentJob?: string;
}) {
  if (args.age !== undefined && (!Number.isInteger(args.age) || args.age < 16 || args.age > 85)) {
    throw new ConvexError("Invalid age. Must be a whole number between 16 and 85 years.");
  }

  if (args.yearGraduated) {
    const cleanYear = args.yearGraduated.trim();
    const currentYear = new Date().getFullYear();
    const yearNum = Number(cleanYear);
    if (!/^\d{4}$/.test(cleanYear) || isNaN(yearNum) || yearNum < 1950 || yearNum > currentYear + 1) {
      throw new ConvexError(
        `Invalid Year Graduated in ROTC (${cleanYear}). Must be a 4-digit calendar year between 1950 and ${currentYear + 1}.`
      );
    }
  }

  if (args.trainingCategory) {
    const catUpper = args.trainingCategory.trim().toUpperCase();
    if (!VALID_TRAINING_CATEGORIES.includes(catUpper)) {
      throw new ConvexError(
        `Invalid Training Category. Must be one of: ${VALID_TRAINING_CATEGORIES.join(", ")}`
      );
    }
  }

  if (args.school && args.school.trim().length > 150) {
    throw new ConvexError("School name must not exceed 150 characters.");
  }

  if (args.currentAddress && args.currentAddress.trim().length > 250) {
    throw new ConvexError("Current address must not exceed 250 characters.");
  }

  if (args.skills && args.skills.trim().length > 300) {
    throw new ConvexError("Skills field must not exceed 300 characters.");
  }

  if (args.currentJob && args.currentJob.trim().length > 150) {
    throw new ConvexError("Current occupation must not exceed 150 characters.");
  }
}

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
    targetCompany: v.optional(v.string()),
    groupId: v.optional(v.string()),
    groupName: v.string(),
    durationStr: v.string(),
    createdBy: v.string(),
    createdByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.createdByEmail, "create enlistment campaign");
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
    const targetUnit = args.targetUnit?.trim() || "10RCDG";

    const campaignId = await ctx.db.insert("enlistmentCampaigns", {
      campaignCode,
      title: args.title.trim(),
      instructions: args.instructions?.trim() || undefined,
      passcode: cleanPasscode,
      targetUnit,
      targetCompany: args.targetCompany?.trim() || undefined,
      groupId: args.groupId,
      groupName: args.groupName.trim() || "All 10RCDG Personnel",
      expiresAt,
      duration: args.durationStr.trim(),
      status: "ACTIVE",
      totalSubmissions: 0,
      pendingCount: 0,
      approvedCount: 0,
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

// One-time / repair synchronization to compute and store submission counts on enlistmentCampaigns
export const syncCampaignCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("enlistmentCampaigns").collect();
    const submissions = await ctx.db.query("enlistmentSubmissions").collect();

    let updated = 0;
    for (const c of campaigns) {
      const campSubs = submissions.filter((s) => s.campaignId === c._id);
      const pendingCount = campSubs.filter((s) => s.status === "PENDING").length;
      const approvedCount = campSubs.filter((s) => s.status === "APPROVED").length;

      await ctx.db.patch(c._id, {
        totalSubmissions: campSubs.length,
        pendingCount,
        approvedCount,
      });
      updated++;
    }
    return { success: true, updated };
  },
});

// 2. List all Campaigns (For Commander / S3 Dashboard - zero submission table scans)
export const listCampaigns = query({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("enlistmentCampaigns").order("desc").collect();
    const now = Date.now();

    return campaigns.map((c) => {
      const isExpired = now >= c.expiresAt || c.status === "CLOSED";

      return {
        ...c,
        totalSubmissions: c.totalSubmissions ?? 0,
        pendingCount: c.pendingCount ?? 0,
        approvedCount: c.approvedCount ?? 0,
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
    const campaign =
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", cleanCode))
        .first()) ||
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", args.campaignCode.trim()))
        .first());

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
      targetCompany: campaign.targetCompany,
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
    const campaign =
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", cleanCode))
        .first()) ||
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", args.campaignCode.trim()))
        .first());

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
    const campaign =
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", cleanCode))
        .first()) ||
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", args.campaignCode.trim()))
        .first());

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

// 4c. Check Step 1 Duplicate (Prevents proceeding to Step 2 if soldier or number is already registered/pending)
export const checkStep1Duplicate = mutation({
  args: {
    mobileNumber: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    campaignCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    const cleanFirst = args.firstName.trim().replace(/\s+/g, " ").toLowerCase();
    const cleanLast = args.lastName.trim().replace(/\s+/g, " ").toLowerCase();

    // Strict First Name + Last Name matching helper (Prevents blocking different soldiers with same family name)
    const isFullNameMatch = (first?: string, last?: string) => {
      const f = (first || "").trim().replace(/\s+/g, " ").toLowerCase();
      const l = (last || "").trim().replace(/\s+/g, " ").toLowerCase();
      return f === cleanFirst && l === cleanLast;
    };

    // 1. Check active personnel roster
    // Check by Mobile Number in active personnel using index (1 document read)
    const existingTroopByPhone =
      (await ctx.db
        .query("personnel")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", cleanMobile))
        .first()) ||
      (await ctx.db
        .query("personnel")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", "0" + cleanMobile.slice(3)))
        .first());

    if (existingTroopByPhone) {
      const isSameName = isFullNameMatch(existingTroopByPhone.firstName, existingTroopByPhone.lastName);

      if (isSameName) {
        return {
          isDuplicate: true,
          status: "ALREADY_REGISTERED",
          message: `Soldier ${existingTroopByPhone.rank} ${existingTroopByPhone.firstName} ${existingTroopByPhone.lastName} is already registered in the official 10RCDG personnel roster (${existingTroopByPhone.groupName}). You can proceed directly to download the official mobile app.`,
          canDownload: true,
        };
      } else {
        return {
          isDuplicate: true,
          status: "PHONE_REGISTERED",
          message: `This mobile number (${args.mobileNumber}) is already registered to ${existingTroopByPhone.rank} ${existingTroopByPhone.firstName} ${existingTroopByPhone.lastName} (${existingTroopByPhone.groupName}). Duplicate numbers are not allowed. Please enter your personal mobile number.`,
          canDownload: false,
        };
      }
    }

    // Check by First Name + Last Name in active personnel using surname index
    const trimmedLast = args.lastName.trim();
    const lastNameVariations = Array.from(
      new Set([
        trimmedLast,
        trimmedLast.toUpperCase(),
        trimmedLast.charAt(0).toUpperCase() + trimmedLast.slice(1).toLowerCase(),
      ])
    );

    let surnameTroops: any[] = [];
    for (const variant of lastNameVariations) {
      const troops = await ctx.db
        .query("personnel")
        .withIndex("by_lastName", (q) => q.eq("lastName", variant))
        .collect();
      surnameTroops.push(...troops);
    }

    const existingTroopByName =
      surnameTroops.find((p) => isFullNameMatch(p.firstName, p.lastName)) || null;

    if (existingTroopByName) {
      return {
        isDuplicate: true,
        status: "NAME_REGISTERED",
        message: `A soldier named ${existingTroopByName.rank} ${existingTroopByName.firstName} ${existingTroopByName.lastName} is already registered in the active 10RCDG personnel roster (${existingTroopByName.groupName}). If you need to update your registered phone number, please report to your system administrators.`,
        canDownload: true,
      };
    }

    // 2. Check pending / approved enlistment submissions using index
    const existingSubmissionByPhone =
      (await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", cleanMobile))
        .first()) ||
      (await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", "0" + cleanMobile.slice(3)))
        .first());

    if (existingSubmissionByPhone && existingSubmissionByPhone.status !== "REJECTED") {
      const isSameName = isFullNameMatch(existingSubmissionByPhone.firstName, existingSubmissionByPhone.lastName);

      if (isSameName) {
        return {
          isDuplicate: true,
          status: "SUBMISSION_PENDING",
          message: `You have already submitted an enlistment application for ${existingSubmissionByPhone.rank} ${existingSubmissionByPhone.firstName} ${existingSubmissionByPhone.lastName} under batch ${existingSubmissionByPhone.campaignCode}. Your application is currently awaiting Command approval.`,
          canDownload: false,
        };
      } else {
        return {
          isDuplicate: true,
          status: "SUBMISSION_PHONE_PENDING",
          message: `This mobile number is already used in an existing enlistment submission for ${existingSubmissionByPhone.rank} ${existingSubmissionByPhone.firstName} ${existingSubmissionByPhone.lastName}. Please verify your phone number.`,
          canDownload: false,
        };
      }
    }

    // Check by Name in pending submissions using surname index
    let surnameSubmissions: any[] = [];
    for (const variant of lastNameVariations) {
      const subs = await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_lastName", (q) => q.eq("lastName", variant))
        .collect();
      surnameSubmissions.push(...subs);
    }

    const existingSubmissionByName =
      surnameSubmissions.find(
        (s) => s.status !== "REJECTED" && isFullNameMatch(s.firstName, s.lastName)
      ) || null;


    if (existingSubmissionByName) {
      return {
        isDuplicate: true,
        status: "SUBMISSION_NAME_PENDING",
        message: `An enlistment application for ${existingSubmissionByName.rank} ${existingSubmissionByName.firstName} ${existingSubmissionByName.lastName} (Batch Code: ${existingSubmissionByName.campaignCode}) has already been submitted and is awaiting administrator approval.`,
        canDownload: false,
      };
    }

    return {
      isDuplicate: false,
      status: "OK",
      message: "Validation successful.",
      canDownload: false,
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
    company: v.optional(v.string()),
    groupId: v.optional(v.string()),
    groupName: v.string(),
    email: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    school: v.optional(v.string()),
    yearGraduated: v.optional(v.string()),
    trainingCategory: v.optional(v.string()),
    skills: v.optional(v.string()),
    currentAddress: v.optional(v.string()),
    age: v.optional(v.number()),
    currentJob: v.optional(v.string()),
    deviceType: v.optional(v.union(v.literal("ANDROID"), v.literal("KEYPAD"), v.literal("IOS"))),
    deviceId: v.optional(v.string()),
    deviceModel: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanCode = args.campaignCode.toLowerCase().trim();
    const campaign =
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", cleanCode))
        .first()) ||
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", args.campaignCode.trim()))
        .first());

    if (!campaign) {
      throw new ConvexError("Invalid or non-existent enlistment campaign.");
    }

    if (Date.now() >= campaign.expiresAt || campaign.status === "CLOSED") {
      throw new ConvexError("This enlistment registration window has closed.");
    }

    if (campaign.passcode.trim().toUpperCase() !== args.passcode.trim().toUpperCase()) {
      throw new ConvexError("Invalid unit passcode. Entry denied.");
    }

    // Validate Military & Reservist Background fields
    validateReservistFields({
      age: args.age,
      yearGraduated: args.yearGraduated,
      trainingCategory: args.trainingCategory,
      school: args.school,
      currentAddress: args.currentAddress,
      skills: args.skills,
      currentJob: args.currentJob,
    });

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

    // 1. Check if number already exists in active personnel directory using index
    const existingPersonnel =
      (await ctx.db
        .query("personnel")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", cleanMobile))
        .first()) ||
      (await ctx.db
        .query("personnel")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", "0" + cleanMobile.slice(3)))
        .first());

    if (existingPersonnel) {
      throw new ConvexError(
        `This mobile number (${cleanMobile}) is already registered in the official 10RCDG personnel roster. You can download the app directly at the official download portal (/download).`
      );
    }

    // 2. Check if number already exists across enlistment submissions (pending or approved) using index
    const existingSubmission =
      (await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", cleanMobile))
        .first()) ||
      (await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", "0" + cleanMobile.slice(3)))
        .first());

    if (existingSubmission && existingSubmission.status !== "REJECTED") {
      throw new ConvexError(
        `You have already submitted an enlistment request for this mobile number (${cleanMobile}). Please wait for administrator approval so you can download the app at the official download portal (/download).`
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
      company: args.company?.trim() || undefined,
      groupId: campaign.groupId || args.groupId,
      groupName:
        campaign.groupName && campaign.groupName !== "All 10RCDG Personnel"
          ? campaign.groupName
          : (args.groupName?.trim() || campaign.groupName || "All 10RCDG Personnel"),
      email: args.email?.trim() || undefined,
      serialNumber: args.serialNumber?.trim() || undefined,
      school: args.school?.trim() || undefined,
      yearGraduated: args.yearGraduated?.trim() || undefined,
      trainingCategory: args.trainingCategory?.trim() || undefined,
      skills: args.skills?.trim() || undefined,
      currentAddress: args.currentAddress?.trim() || undefined,
      age: typeof args.age === "number" && !isNaN(args.age) ? args.age : undefined,
      currentJob: args.currentJob?.trim() || undefined,
      deviceType: args.deviceType || "ANDROID",
      deviceId: args.deviceId?.trim() || undefined,
      deviceModel: args.deviceModel?.trim() || undefined,
      userAgent: args.userAgent?.trim() || undefined,
      status: "PENDING",
      submittedAt: new Date().toISOString(),
    });

    // Update campaign cached counter
    await adjustCampaignCounts(ctx, campaign._id, { total: 1, pending: 1 });

    return { success: true, submissionId };
  },
});

// 6. List Submissions for Command Review (Indexed & Capped for Scalability)
export const listSubmissions = query({
  args: {
    campaignId: v.optional(v.id("enlistmentCampaigns")),
  },
  handler: async (ctx, args) => {
    if (args.campaignId) {
      return await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId!))
        .order("desc")
        .take(60);
    }
    const pending = await ctx.db
      .query("enlistmentSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .order("desc")
      .take(50);
    const recent = await ctx.db
      .query("enlistmentSubmissions")
      .order("desc")
      .take(50);
    const seen = new Set();
    const combined: any[] = [];
    for (const item of [...pending, ...recent]) {
      if (!seen.has(item._id)) {
        seen.add(item._id);
        combined.push(item);
      }
    }
    return combined;
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
    await assertCallerAuthorized(ctx, args.reviewerEmail, "approve enlistment submission");
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

    // Update campaign counters if moving from PENDING
    if (sub.status === "PENDING" && sub.campaignId) {
      await adjustCampaignCounts(ctx, sub.campaignId, { pending: -1, approved: 1 });
    }

    // Check if soldier already exists in personnel roster using direct index
    const subCore = normalizePhMobile(sub.mobileNumber);
    const canonicalPh = "+63" + subCore;
    const localPh = "0" + subCore;

    const existing =
      (await ctx.db
        .query("personnel")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", canonicalPh))
        .first()) ||
      (await ctx.db
        .query("personnel")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", localPh))
        .first()) ||
      (await ctx.db
        .query("personnel")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", sub.mobileNumber.trim()))
        .first());

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        firstName: sub.firstName,
        lastName: sub.lastName,
        rank: sub.rank,
        unit: sub.unit,
        company: sub.company || existing.company,
        groupName: sub.groupName,
        groupId: sub.groupId,
        status: "ACTIVE",
        deviceType: sub.deviceType || existing.deviceType || "ANDROID",
        email: sub.email || existing.email,
        deviceModel: sub.deviceModel || existing.deviceModel,
        lastDownloadedDeviceModel: sub.deviceModel || existing.lastDownloadedDeviceModel,
        school: sub.school || existing.school,
        yearGraduated: sub.yearGraduated || existing.yearGraduated,
        trainingCategory: sub.trainingCategory || existing.trainingCategory,
        skills: sub.skills || existing.skills,
        currentAddress: sub.currentAddress || existing.currentAddress,
        age: sub.age !== undefined ? sub.age : existing.age,
        currentJob: sub.currentJob || existing.currentJob,
        updatedBy: approverName,
        updatedAt: updateTimestamp,
      });
    } else {
      // Insert new personnel from public enlistment
      await ctx.db.insert("personnel", {
        firstName: sub.firstName,
        lastName: sub.lastName,
        rank: sub.rank,
        mobileNumber: sub.mobileNumber,
        unit: sub.unit,
        company: sub.company,
        groupId: sub.groupId,
        groupName: sub.groupName,
        deviceType: sub.deviceType || "ANDROID",
        deviceModel: sub.deviceModel,
        lastDownloadedDeviceModel: sub.deviceModel,
        school: sub.school,
        yearGraduated: sub.yearGraduated,
        trainingCategory: sub.trainingCategory,
        skills: sub.skills,
        currentAddress: sub.currentAddress,
        age: sub.age,
        currentJob: sub.currentJob,
        status: "ACTIVE",
        email: sub.email,
        createdAt: new Date().toISOString().split("T")[0],
        createdBy: approverName,
      });

      // Increment group member count
      await adjustGroupMemberCount(ctx, sub.groupId, sub.groupName, 1);
    }

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: approverName,
      userRole: "ADMIN",
      category: "PERSONNEL",
      action: "APPROVE_ENLISTMENT",
      details: `Approved enlistment self-registration for ${sub.rank} ${sub.firstName} ${sub.lastName} (${sub.mobileNumber}) into ${sub.groupName}${sub.deviceModel ? ` [Hardware Bound: ${sub.deviceModel}]` : ""}`,
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
    await assertCallerAuthorized(ctx, args.reviewerEmail, "bulk approve enlistment submissions");
    const approverName = args.reviewerName || args.reviewerEmail || "Authorized Officer";
    const updateTimestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

      // Update campaign counters if moving from PENDING
      if (sub.status === "PENDING" && sub.campaignId) {
        await adjustCampaignCounts(ctx, sub.campaignId, { pending: -1, approved: 1 });
      }

      const subCore = normalizePhMobile(sub.mobileNumber);
      const canonicalPh = "+63" + subCore;
      const localPh = "0" + subCore;

      const existing =
        (await ctx.db
          .query("personnel")
          .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", canonicalPh))
          .first()) ||
        (await ctx.db
          .query("personnel")
          .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", localPh))
          .first()) ||
        (await ctx.db
          .query("personnel")
          .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", sub.mobileNumber.trim()))
          .first());
      if (existing) {
        await ctx.db.patch(existing._id, {
          firstName: sub.firstName,
          lastName: sub.lastName,
          rank: sub.rank,
          unit: sub.unit,
          company: sub.company || existing.company,
          groupName: sub.groupName,
          groupId: sub.groupId,
          status: "ACTIVE",
          deviceType: sub.deviceType || existing.deviceType || "ANDROID",
          email: sub.email || existing.email,
          boundDeviceId: sub.deviceId || existing.boundDeviceId,
          deviceModel: sub.deviceModel || existing.deviceModel,
          lastDownloadedDeviceModel: sub.deviceModel || existing.lastDownloadedDeviceModel,
          school: sub.school || existing.school,
          yearGraduated: sub.yearGraduated || existing.yearGraduated,
          trainingCategory: sub.trainingCategory || existing.trainingCategory,
          skills: sub.skills || existing.skills,
          currentAddress: sub.currentAddress || existing.currentAddress,
          age: sub.age !== undefined ? sub.age : existing.age,
          currentJob: sub.currentJob || existing.currentJob,
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
          company: sub.company,
          groupId: sub.groupId,
          groupName: sub.groupName,
          deviceType: sub.deviceType || "ANDROID",
          boundDeviceId: sub.deviceId,
          deviceModel: sub.deviceModel,
          lastDownloadedDeviceModel: sub.deviceModel,
          school: sub.school,
          yearGraduated: sub.yearGraduated,
          trainingCategory: sub.trainingCategory,
          skills: sub.skills,
          currentAddress: sub.currentAddress,
          age: sub.age,
          currentJob: sub.currentJob,
          status: "ACTIVE",
          email: sub.email,
          createdAt: nowStr.split("T")[0],
          createdBy: approverName,
        });

        // Increment group member count
        await adjustGroupMemberCount(ctx, sub.groupId, sub.groupName, 1);
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
    await assertCallerAuthorized(ctx, args.reviewerEmail, "reject enlistment submission");
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) return { success: false };

    const reviewer = args.reviewerName || args.reviewerEmail || "Authorized Officer";
    await ctx.db.patch(args.submissionId, {
      status: "REJECTED",
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer,
    });

    if (sub.status === "PENDING" && sub.campaignId) {
      await adjustCampaignCounts(ctx, sub.campaignId, { pending: -1 });
    }

    return { success: true };
  },
});

// 10. Close / Invalidate Campaign Early
export const closeCampaign = mutation({
  args: {
    campaignId: v.id("enlistmentCampaigns"),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "close enlistment campaign");
    await ctx.db.patch(args.campaignId, {
      status: "CLOSED",
    });
    return { success: true };
  },
});

// 11. Delete Campaign
export const removeCampaign = mutation({
  args: {
    campaignId: v.id("enlistmentCampaigns"),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "delete enlistment campaign");
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new ConvexError("Enlistment campaign not found.");
    }
    const isLive = campaign.status === "ACTIVE" && Date.now() < campaign.expiresAt;
    if (isLive) {
      throw new ConvexError(
        "Active enlistment campaigns cannot be deleted while live. Please close the campaign early or wait until its duration finishes."
      );
    }
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
