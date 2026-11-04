import { internalAction, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Universal Dual-Database Sync Bridge.
 * Asynchronously mirrors mutations between deployments without blocking the main transaction.
 */
export const mirrorMutation = internalAction({
  args: {
    targetCloudUrl: v.string(),
    path: v.string(),
    args: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const res = await fetch(`${args.targetCloudUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: args.path,
          args: args.args,
          format: "json",
        }),
      });
      if (!res.ok) {
        console.warn(`Bridge mirror failed for ${args.path}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`Bridge network error for ${args.path}:`, err);
    }
  },
});

// Helper: Find personnel across all standard Philippine mobile formatting variants
async function findPersonnelByMobile(ctx: any, rawMobile: string) {
  if (!rawMobile) return null;
  const digits = rawMobile.replace(/\D/g, "");
  let searchCore = digits;
  if (digits.startsWith("6309")) searchCore = digits.slice(3);
  else if (digits.startsWith("639")) searchCore = digits.slice(2);
  else if (digits.startsWith("09")) searchCore = digits.slice(1);
  else if (digits.startsWith("9") && digits.length === 10) searchCore = digits;
  else if (digits.length >= 10 && digits.slice(-10).startsWith("9")) searchCore = digits.slice(-10);

  const canonicalPh = "+63" + searchCore;
  const localPh = "0" + searchCore;

  return (
    (await ctx.db
      .query("personnel")
      .withIndex("by_mobileNumber", (q: any) => q.eq("mobileNumber", canonicalPh))
      .first()) ||
    (await ctx.db
      .query("personnel")
      .withIndex("by_mobileNumber", (q: any) => q.eq("mobileNumber", localPh))
      .first()) ||
    (await ctx.db
      .query("personnel")
      .withIndex("by_mobileNumber", (q: any) => q.eq("mobileNumber", rawMobile.trim()))
      .first())
  );
}

/**
 * Sync / Upsert Personnel record from Partner Deployment
 */
export const syncPersonnel = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    rank: v.string(),
    mobileNumber: v.string(),
    unit: v.string(),
    company: v.optional(v.string()),
    groupId: v.optional(v.string()),
    groupName: v.string(),
    deviceType: v.optional(v.union(v.literal("ANDROID"), v.literal("KEYPAD"), v.literal("IOS"))),
    deviceModel: v.optional(v.string()),
    lastDownloadedDeviceModel: v.optional(v.string()),
    school: v.optional(v.string()),
    yearGraduated: v.optional(v.string()),
    trainingCategory: v.optional(v.string()),
    skills: v.optional(v.string()),
    currentAddress: v.optional(v.string()),
    age: v.optional(v.number()),
    currentJob: v.optional(v.string()),
    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
    email: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawMobile = args.mobileNumber;
    const digits = rawMobile.replace(/\D/g, "");
    let searchCore = digits;
    if (digits.startsWith("6309")) searchCore = digits.slice(3);
    else if (digits.startsWith("639")) searchCore = digits.slice(2);
    else if (digits.startsWith("09")) searchCore = digits.slice(1);
    else if (digits.startsWith("9") && digits.length === 10) searchCore = digits;
    else if (digits.length >= 10 && digits.slice(-10).startsWith("9")) searchCore = digits.slice(-10);

    const canonicalPh = "+63" + searchCore;
    const localPh = "0" + searchCore;

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
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", rawMobile.trim()))
        .first());

    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        rank: args.rank,
        unit: args.unit,
        company: args.company || existing.company,
        groupName: args.groupName,
        groupId: args.groupId || existing.groupId,
        status: args.status || "ACTIVE",
        deviceType: args.deviceType || existing.deviceType || "ANDROID",
        email: args.email || existing.email,
        deviceModel: args.deviceModel || existing.deviceModel,
        lastDownloadedDeviceModel: args.lastDownloadedDeviceModel || existing.lastDownloadedDeviceModel,
        school: args.school || existing.school,
        yearGraduated: args.yearGraduated || existing.yearGraduated,
        trainingCategory: args.trainingCategory || existing.trainingCategory,
        skills: args.skills || existing.skills,
        currentAddress: args.currentAddress || existing.currentAddress,
        age: args.age !== undefined ? args.age : existing.age,
        currentJob: args.currentJob || existing.currentJob,
        updatedBy: args.updatedBy || "Sync Bridge",
        updatedAt: args.updatedAt,
      });
      return { success: true, updated: true, id: existing._id };
    } else {
      const id = await ctx.db.insert("personnel", {
        firstName: args.firstName,
        lastName: args.lastName,
        rank: args.rank,
        mobileNumber: args.mobileNumber,
        unit: args.unit,
        company: args.company,
        groupId: args.groupId,
        groupName: args.groupName,
        deviceType: args.deviceType || "ANDROID",
        deviceModel: args.deviceModel,
        lastDownloadedDeviceModel: args.lastDownloadedDeviceModel,
        school: args.school,
        yearGraduated: args.yearGraduated,
        trainingCategory: args.trainingCategory,
        skills: args.skills,
        currentAddress: args.currentAddress,
        age: args.age,
        currentJob: args.currentJob,
        status: args.status || "ACTIVE",
        email: args.email,
        createdAt: args.createdAt || new Date().toISOString().split("T")[0],
        createdBy: args.createdBy || "Sync Bridge",
      });
      return { success: true, inserted: true, id };
    }
  },
});

/**
 * Sync / Upsert Enlistment Submission record from Partner Deployment
 */
export const syncSubmission = mutation({
  args: {
    campaignCode: v.string(),
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
    deviceModel: v.optional(v.string()),
    status: v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED")),
    submittedAt: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawMobile = args.mobileNumber;
    const digits = rawMobile.replace(/\D/g, "");
    let searchCore = digits;
    if (digits.startsWith("6309")) searchCore = digits.slice(3);
    else if (digits.startsWith("639")) searchCore = digits.slice(2);
    else if (digits.startsWith("09")) searchCore = digits.slice(1);
    else if (digits.startsWith("9") && digits.length === 10) searchCore = digits;
    else if (digits.length >= 10 && digits.slice(-10).startsWith("9")) searchCore = digits.slice(-10);

    const canonicalPh = "+63" + searchCore;
    const localPh = "0" + searchCore;

    const existing =
      (await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", canonicalPh))
        .first()) ||
      (await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", localPh))
        .first()) ||
      (await ctx.db
        .query("enlistmentSubmissions")
        .withIndex("by_mobileNumber", (q) => q.eq("mobileNumber", rawMobile.trim()))
        .first());

    // Resolve local campaign if possible (exact, lowercase, or first available)
    let resolvedCampaignId: any = undefined;
    const camp =
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", args.campaignCode.trim()))
        .first()) ||
      (await ctx.db
        .query("enlistmentCampaigns")
        .withIndex("by_campaignCode", (q) => q.eq("campaignCode", args.campaignCode.toLowerCase().trim()))
        .first()) ||
      (await ctx.db.query("enlistmentCampaigns").first());

    if (camp) {
      resolvedCampaignId = camp._id;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        rank: args.rank,
        unit: args.unit,
        company: args.company,
        groupId: args.groupId,
        groupName: args.groupName,
        status: args.status,
      });
      return { success: true, updated: true, id: existing._id };
    } else if (resolvedCampaignId) {
      const id = await ctx.db.insert("enlistmentSubmissions", {
        campaignId: resolvedCampaignId,
        campaignCode: args.campaignCode,
        firstName: args.firstName,
        lastName: args.lastName,
        rank: args.rank,
        mobileNumber: args.mobileNumber,
        unit: args.unit,
        company: args.company,
        groupId: args.groupId,
        groupName: args.groupName,
        email: args.email,
        serialNumber: args.serialNumber,
        school: args.school,
        yearGraduated: args.yearGraduated,
        trainingCategory: args.trainingCategory,
        skills: args.skills,
        currentAddress: args.currentAddress,
        age: args.age,
        currentJob: args.currentJob,
        deviceType: args.deviceType,
        deviceModel: args.deviceModel,
        status: args.status,
        submittedAt: args.submittedAt,
        userAgent: args.userAgent,
      });
      return { success: true, inserted: true, id };
    }
    return { success: false, reason: "Campaign not found" };
  },
});

/**
 * Sync Device Linking / Pairing from Partner Deployment using Mobile Number
 */
export const syncDeviceLink = mutation({
  args: {
    mobileNumber: v.string(),
    fcmToken: v.optional(v.string()),
    deviceModel: v.optional(v.string()),
    appDeviceId: v.optional(v.string()),
    boundDeviceId: v.optional(v.string()),
    lastActiveAt: v.optional(v.string()),
    appInstalledAt: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isGpsEnabled: v.optional(v.boolean()),
    locationAccuracy: v.optional(v.number()),
    locationUpdatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const soldier = await findPersonnelByMobile(ctx, args.mobileNumber);
    if (!soldier) {
      console.warn(`[Bridge] Soldier with mobile ${args.mobileNumber} not found for syncDeviceLink.`);
      return { success: false, reason: "Soldier not found" };
    }

    const nowIso = new Date().toISOString();
    await ctx.db.patch(soldier._id, {
      ...(args.fcmToken !== undefined ? { fcmToken: args.fcmToken } : {}),
      ...(args.deviceModel !== undefined
        ? {
            deviceModel: args.deviceModel,
            lastDownloadedDeviceModel: args.deviceModel,
            deviceType: "ANDROID" as const,
          }
        : {}),
      ...(args.appDeviceId !== undefined
        ? {
            appDeviceId: args.appDeviceId,
            boundDeviceId: soldier.boundDeviceId || args.boundDeviceId || args.appDeviceId,
          }
        : {}),
      lastActiveAt: args.lastActiveAt || nowIso,
      appInstalledAt: soldier.appInstalledAt || args.appInstalledAt || nowIso,
      ...(args.latitude !== undefined && args.longitude !== undefined
        ? {
            latitude: args.latitude,
            longitude: args.longitude,
            locationAccuracy: args.locationAccuracy,
            locationUpdatedAt: args.locationUpdatedAt || nowIso,
            isGpsEnabled: args.isGpsEnabled ?? true,
          }
        : {}),
    });

    return { success: true, soldierId: soldier._id };
  },
});

/**
 * Sync Device Unlinking from Partner Deployment using Mobile Number
 */
export const syncDeviceUnlink = mutation({
  args: {
    mobileNumber: v.string(),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const soldier = await findPersonnelByMobile(ctx, args.mobileNumber);
    if (!soldier) {
      return { success: false, reason: "Soldier not found" };
    }

    await ctx.db.patch(soldier._id, {
      fcmToken: undefined,
      deviceModel: undefined,
      appDeviceId: undefined,
      boundDeviceId: undefined,
      latitude: undefined,
      longitude: undefined,
      locationAccuracy: undefined,
      locationUpdatedAt: undefined,
      isGpsEnabled: undefined,
    });

    return { success: true, soldierId: soldier._id };
  },
});

/**
 * Sync Live GPS Location from Partner Deployment using Mobile Number
 */
export const syncLocation = mutation({
  args: {
    mobileNumber: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    locationAccuracy: v.optional(v.number()),
    isGpsEnabled: v.optional(v.boolean()),
    locationUpdatedAt: v.string(),
    lastActiveAt: v.string(),
  },
  handler: async (ctx, args) => {
    const soldier = await findPersonnelByMobile(ctx, args.mobileNumber);
    if (!soldier) {
      return { success: false, reason: "Soldier not found" };
    }

    await ctx.db.patch(soldier._id, {
      latitude: args.latitude,
      longitude: args.longitude,
      locationAccuracy: args.locationAccuracy,
      isGpsEnabled: args.isGpsEnabled ?? true,
      locationUpdatedAt: args.locationUpdatedAt,
      lastActiveAt: args.lastActiveAt,
    });

    return { success: true, soldierId: soldier._id };
  },
});

/**
 * Sync Personnel Removal from Partner Deployment using Mobile Number
 */
export const syncRemovePersonnel = mutation({
  args: {
    mobileNumber: v.string(),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const soldier = await findPersonnelByMobile(ctx, args.mobileNumber);
    if (soldier) {
      await ctx.db.delete(soldier._id);
    }
    return { success: true };
  },
});
