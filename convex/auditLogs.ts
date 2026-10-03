import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all audit logs
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("auditLogs").order("desc").collect();
  },
});

// Record a new audit log
export const log = mutation({
  args: {
    userName: v.string(),
    userEmail: v.optional(v.string()),
    userRole: v.string(),
    action: v.string(),
    category: v.union(
      v.literal("AUTH"),
      v.literal("BROADCAST"),
      v.literal("PERSONNEL"),
      v.literal("SECURITY"),
      v.literal("CONFIG")
    ),
    details: v.string(),
    ipAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    return await ctx.db.insert("auditLogs", {
      ...args,
      timestamp,
    });
  },
});
