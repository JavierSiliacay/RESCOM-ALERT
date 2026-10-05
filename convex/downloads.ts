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
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
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
      });

      return {
        isNewDevice: false,
        downloadCount: existing.downloadCount + 1,
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
    });

    return {
      isNewDevice: true,
      downloadCount: 1,
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
      .slice(0, 8)
      .map((d) => ({
        id: d._id,
        deviceModel: d.deviceModel || "Android Device",
        osVersion: d.osVersion || "Android",
        lastDownloadedAt: d.lastDownloadedAt,
        downloadCount: d.downloadCount,
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
