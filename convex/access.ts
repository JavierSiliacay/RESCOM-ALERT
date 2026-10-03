import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all authorized officers
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("authorizedUsers").collect();
  },
});

// Authorize new officer
export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    rank: v.string(),
    role: v.union(
      v.literal("COMMANDER"),
      v.literal("ADMIN"),
      v.literal("OPERATOR"),
      v.literal("VIEWER")
    ),
    unit: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("authorizedUsers", {
      ...args,
      status: "APPROVED",
      approvedDate: new Date().toISOString().split("T")[0],
      lastLogin: "Never",
    });
  },
});

// Update officer role or clearance
export const updateRole = mutation({
  args: {
    id: v.id("authorizedUsers"),
    role: v.union(
      v.literal("COMMANDER"),
      v.literal("ADMIN"),
      v.literal("OPERATOR"),
      v.literal("VIEWER")
    ),
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
      v.literal("SUSPENDED")
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Revoke authorization
export const remove = mutation({
  args: {
    id: v.id("authorizedUsers"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
