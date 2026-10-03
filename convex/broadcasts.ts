import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    status: v.union(v.literal("DELIVERED"), v.literal("SENDING"), v.literal("FAILED")),
    simSubscriptionId: v.optional(v.number()),
    gatewayBatchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
      details: `Dispatched broadcast [${args.title}] to ${args.totalRecipients} recipients via SIM ${args.simSubscriptionId || 1}`,
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
