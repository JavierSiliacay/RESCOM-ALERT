import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Records an app download event with strict unique-device deduplication.
 * If the device already downloaded before, it only updates the timestamp
 * and download count, without inflating the unique device count.
 */
export const record = mutation({
  args: {
    deviceId: v.string(),
    userAgent: v.string(),
    deviceModel: v.optional(v.string()),
    osVersion: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    soldierId: v.optional(v.id("personnel")),
    soldierName: v.optional(v.string()),
    soldierRank: v.optional(v.string()),
    mobileNumber: v.optional(v.string()),
    unit: v.optional(v.string()),
    groupName: v.optional(v.string()),
    isAuthorizedQr: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // 1. Look up existing personnel record if soldierId or mobileNumber is provided
    let matchedPersonnel = null;
    if (args.soldierId) {
      matchedPersonnel = await ctx.db.get(args.soldierId);
    } else if (args.mobileNumber) {
      const searchCore = args.mobileNumber.replace(/\D/g, "").slice(-10);
      const allPersonnel = await ctx.db.query("personnel").collect();
      matchedPersonnel =
        allPersonnel.find((p) => p.mobileNumber.replace(/\D/g, "").slice(-10) === searchCore) || null;
    }

    // 2. Determine previous device model and hardware switch status
    const prevDevice =
      matchedPersonnel?.lastDownloadedDeviceModel ||
      matchedPersonnel?.deviceModel ||
      undefined;
    const isSwitch = Boolean(
      prevDevice && args.deviceModel && prevDevice !== args.deviceModel
    );

    // 3. Update personnel record with latest download telemetry
    if (matchedPersonnel) {
      await ctx.db.patch(matchedPersonnel._id, {
        lastDownloadedAt: now,
        lastDownloadedDeviceModel: args.deviceModel || matchedPersonnel.lastDownloadedDeviceModel,
        ...(isSwitch
          ? { previousDeviceModel: prevDevice }
          : matchedPersonnel.previousDeviceModel
            ? { previousDeviceModel: matchedPersonnel.previousDeviceModel }
            : {}),
      });

      // Insert audit log for OPSEC download tracking
      await ctx.db.insert("auditLogs", {
        userName: `${matchedPersonnel.rank} ${matchedPersonnel.firstName} ${matchedPersonnel.lastName}`,
        userRole: "SOLDIER",
        category: "SECURITY",
        action: isSwitch ? "DEVICE_SWITCH_DOWNLOAD" : "APP_DOWNLOAD",
        details: `${matchedPersonnel.rank} ${matchedPersonnel.firstName} ${matchedPersonnel.lastName} (${matchedPersonnel.mobileNumber}) downloaded app using ${args.deviceModel || "Android Device"}.`,
        ipAddress: args.ipAddress || "127.0.0.1",
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      });
    }

    // 4. Update or insert appDownloads record (deduplicated by deviceId)
    const existing = await ctx.db
      .query("appDownloads")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (existing) {
      // Repeat download on the same device — update telemetry without incrementing unique devices
      await ctx.db.patch(existing._id, {
        downloadCount: existing.downloadCount + 1,
        lastDownloadedAt: now,
        userAgent: args.userAgent,
        deviceModel: args.deviceModel || existing.deviceModel,
        osVersion: args.osVersion || existing.osVersion,
        soldierId: args.soldierId ?? existing.soldierId,
        soldierName: args.soldierName ?? existing.soldierName,
        soldierRank: args.soldierRank ?? existing.soldierRank,
        mobileNumber: args.mobileNumber ?? existing.mobileNumber,
        unit: args.unit ?? existing.unit,
        groupName: args.groupName ?? existing.groupName,
        previousDeviceModel: prevDevice ?? existing.previousDeviceModel,
        isDeviceSwitch: isSwitch || existing.isDeviceSwitch,
      });

      return {
        isNewDevice: false,
        downloadCount: existing.downloadCount + 1,
        previousDeviceModel: prevDevice ?? existing.previousDeviceModel,
        isDeviceSwitch: isSwitch,
      };
    }

    // Brand new device
    await ctx.db.insert("appDownloads", {
      deviceId: args.deviceId,
      userAgent: args.userAgent,
      deviceModel: args.deviceModel,
      osVersion: args.osVersion,
      ipAddress: args.ipAddress,
      firstDownloadedAt: now,
      lastDownloadedAt: now,
      downloadCount: 1,
      soldierId: args.soldierId,
      soldierName: args.soldierName,
      soldierRank: args.soldierRank,
      mobileNumber: args.mobileNumber,
      unit: args.unit,
      groupName: args.groupName,
      previousDeviceModel: prevDevice,
      isDeviceSwitch: isSwitch,
    });

    return {
      isNewDevice: true,
      downloadCount: 1,
      previousDeviceModel: prevDevice,
      isDeviceSwitch: isSwitch,
    };
  },
});

/**
 * Retrieves live download telemetry for the Commander dashboard.
 */
export const getStats = query({
  handler: async (ctx) => {
    const downloads = await ctx.db.query("appDownloads").collect();

    const uniqueDevices = downloads.length;
    const totalDownloads = downloads.reduce((acc, curr) => acc + curr.downloadCount, 0);

    // Sort recent downloads by lastDownloadedAt descending
    const recentDownloads = [...downloads]
      .sort((a, b) => new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime())
      .slice(0, 12)
      .map((d) => ({
        id: d._id,
        deviceModel: d.deviceModel || "Android Device",
        osVersion: d.osVersion || "Android",
        lastDownloadedAt: d.lastDownloadedAt,
        downloadCount: d.downloadCount,
        soldierName: d.soldierName,
        soldierRank: d.soldierRank,
        mobileNumber: d.mobileNumber,
        unit: d.unit,
        groupName: d.groupName,
        previousDeviceModel: d.previousDeviceModel,
        isDeviceSwitch: d.isDeviceSwitch,
      }));

    return {
      uniqueDevices,
      totalDownloads,
      recentDownloads,
    };
  },
});

/**
 * Clears all download telemetry records (used for test resets).
 */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("appDownloads").collect();
    for (const record of records) {
      await ctx.db.delete(record._id);
    }
    return { deleted: records.length };
  },
});

/**
 * Retrieves the public download portal OPSEC status.
 * If no record has been created yet, defaults to OPEN (true).
 */
export const getPortalSettings = query({
  handler: async (ctx) => {
    const settings = await ctx.db.query("appPortalSettings").first();
    if (!settings) {
      return {
        isDownloadPortalEnabled: true,
        allowRosterVerification: true,
        lockdownReason:
          "Public application provisioning is temporarily restricted by Command Headquarters (10RCDG). Contact your unit communication officer for offline installation.",
        requirePasscode: false,
        passcode: undefined as string | undefined,
        passcodeExpiresAt: undefined as number | undefined,
        updatedBy: "System Default",
        updatedAt: new Date().toISOString(),
      };
    }
    return settings;
  },
});

/**
 * Updates the public download portal OPSEC status.
 * Controls the master kill switch and phone verification lookup gate.
 */
export const updatePortalSettings = mutation({
  args: {
    isDownloadPortalEnabled: v.boolean(),
    allowRosterVerification: v.boolean(),
    lockdownReason: v.optional(v.string()),
    requirePasscode: v.optional(v.boolean()),
    passcode: v.optional(v.string()),
    passcodeExpiresAt: v.optional(v.number()),
    updatedBy: v.optional(v.string()),
    updatedByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("appPortalSettings").first();
    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isDownloadPortalEnabled: args.isDownloadPortalEnabled,
        allowRosterVerification: args.allowRosterVerification,
        lockdownReason: args.lockdownReason !== undefined ? args.lockdownReason : existing.lockdownReason,
        requirePasscode: args.requirePasscode !== undefined ? args.requirePasscode : existing.requirePasscode,
        passcode: args.passcode !== undefined ? args.passcode : existing.passcode,
        passcodeExpiresAt: args.passcodeExpiresAt !== undefined ? args.passcodeExpiresAt : undefined,
        updatedBy: args.updatedBy ?? "Authorized Officer",
        updatedByEmail: args.updatedByEmail,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appPortalSettings", {
        isDownloadPortalEnabled: args.isDownloadPortalEnabled,
        allowRosterVerification: args.allowRosterVerification,
        lockdownReason:
          args.lockdownReason ??
          "Public application provisioning is temporarily restricted by Command Headquarters (10RCDG). Contact your unit communication officer for offline installation.",
        requirePasscode: args.requirePasscode ?? false,
        passcode: args.passcode,
        passcodeExpiresAt: args.passcodeExpiresAt,
        updatedBy: args.updatedBy ?? "Authorized Officer",
        updatedByEmail: args.updatedByEmail,
        updatedAt: now,
      });
    }

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: args.updatedBy ?? "Authorized Officer",
      userRole: "ADMIN",
      category: "SECURITY",
      action: args.isDownloadPortalEnabled ? "PORTAL_OPENED" : "PORTAL_LOCKDOWN",
      details: `Mobile download portal status set to ${args.isDownloadPortalEnabled ? "ACTIVE (OPEN)" : "LOCKDOWN (DISABLED)"}. Phone lookup: ${args.allowRosterVerification ? "ENABLED" : "DISABLED"}`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });

    return { success: true };
  },
});

