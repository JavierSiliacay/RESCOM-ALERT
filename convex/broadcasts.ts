import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertCallerAuthorized, assertCallerAuthorizedGroup } from "./access";

// List recent broadcast transmissions
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("broadcasts").order("desc").collect();
  },
});

// Record a new broadcast transmission
export const record = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    senderName: v.string(),
    senderEmail: v.optional(v.string()),
    senderRank: v.optional(v.string()),
    targetGroupNames: v.array(v.string()),
    recipients: v.array(v.string()),
    totalRecipients: v.number(),
    deliveredCount: v.number(),
    failedCount: v.number(),
    channel: v.optional(v.union(v.literal("HYBRID"), v.literal("APP_PUSH"), v.literal("KEYPAD_SMS"), v.literal("FORCE_SMS"))),
    pushRecipientCount: v.optional(v.number()),
    smsRecipientCount: v.optional(v.number()),
    status: v.union(v.literal("DELIVERED"), v.literal("SENDING"), v.literal("FAILED")),
    simSubscriptionId: v.optional(v.number()),
    gatewayBatchId: v.optional(v.string()),
    recipientStatuses: v.optional(
      v.array(
        v.object({
          number: v.string(),
          status: v.string(),
          channel: v.optional(v.string()),
          sentAt: v.optional(v.string()),
          error: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.senderEmail, "record SMS broadcast");
    await assertCallerAuthorizedGroup(ctx, args.senderEmail, args.targetGroupNames, "transmit SMS broadcast");
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const id = await ctx.db.insert("broadcasts", {
      ...args,
      sentAt: timestamp,
    });

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: args.senderName,
      userEmail: args.senderEmail,
      userRole: "COMMANDER",
      category: "BROADCAST",
      action: "TRANSMIT_SMS",
      details: `Dispatched broadcast [${args.title}] to ${args.totalRecipients} recipients via SIM ${args.simSubscriptionId || 1}${args.gatewayBatchId ? ` [Batch: ${args.gatewayBatchId}]` : ""}`,
      ipAddress: "127.0.0.1",
      timestamp,
    });

    return id;
  },
});

// Update delivery status of a broadcast
export const updateStatus = mutation({
  args: {
    id: v.id("broadcasts"),
    deliveredCount: v.number(),
    failedCount: v.number(),
    status: v.union(v.literal("DELIVERED"), v.literal("SENDING"), v.literal("FAILED")),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Update verified batch telemetry and individual recipient statuses from gateway
export const updateBatchDetails = mutation({
  args: {
    id: v.id("broadcasts"),
    deliveredCount: v.number(),
    failedCount: v.number(),
    status: v.union(v.literal("DELIVERED"), v.literal("SENDING"), v.literal("FAILED")),
    gatewayBatchId: v.optional(v.string()),
    recipientStatuses: v.optional(
      v.array(
        v.object({
          number: v.string(),
          status: v.string(),
          sentAt: v.optional(v.string()),
          error: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Delete a single broadcast transmission record from outbox
export const remove = mutation({
  args: {
    id: v.id("broadcasts"),
    senderEmail: v.optional(v.string()),
    senderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.senderEmail, "delete broadcast record");
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      return false;
    }

    await ctx.db.delete(args.id);

    // Record audit log
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    await ctx.db.insert("auditLogs", {
      userName: args.senderName || "Commander",
      userEmail: args.senderEmail,
      userRole: "COMMANDER",
      category: "BROADCAST",
      action: "DELETE_BROADCAST",
      details: `Deleted broadcast record [${existing.title}] sent at ${existing.sentAt} (${existing.totalRecipients} recipients)`,
      ipAddress: "127.0.0.1",
      timestamp,
    });

    return true;
  },
});

// Bulk delete broadcast transmission records from outbox
export const removeMany = mutation({
  args: {
    ids: v.array(v.id("broadcasts")),
    senderEmail: v.optional(v.string()),
    senderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.senderEmail, "bulk delete broadcast records");
    let deletedCount = 0;
    for (const id of args.ids) {
      const existing = await ctx.db.get(id);
      if (existing) {
        await ctx.db.delete(id);
        deletedCount++;
      }
    }

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    await ctx.db.insert("auditLogs", {
      userName: args.senderName || "Commander",
      userEmail: args.senderEmail,
      userRole: "COMMANDER",
      category: "BROADCAST",
      action: "PURGE_BROADCASTS",
      details: `Deleted ${deletedCount} broadcast records from sent outbox to clean up database`,
      ipAddress: "127.0.0.1",
      timestamp,
    });

    return deletedCount;
  },
});

