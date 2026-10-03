import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all personnel
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("personnel").order("desc").collect();
  },
});

// Add new personnel
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    rank: v.string(),
    mobileNumber: v.string(),
    groupId: v.optional(v.string()),
    groupName: v.string(),
    unit: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("personnel", {
      ...args,
      status: "ACTIVE",
      createdAt: new Date().toISOString().split("T")[0],
    });

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: "Authorized Officer",
      userRole: "ADMIN",
      category: "PERSONNEL",
      action: "ADD_PERSONNEL",
      details: `Added ${args.rank} ${args.firstName} ${args.lastName} (${args.mobileNumber}) to ${args.groupName}`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });

    return id;
  },
});

// Update personnel details
export const update = mutation({
  args: {
    id: v.id("personnel"),
    firstName: v.string(),
    lastName: v.string(),
    rank: v.string(),
    mobileNumber: v.string(),
    groupId: v.optional(v.string()),
    groupName: v.string(),
    unit: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Toggle active/inactive status
export const toggleStatus = mutation({
  args: {
    id: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const person = await ctx.db.get(args.id);
    if (!person) throw new Error("Personnel not found");

    const newStatus = person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await ctx.db.patch(args.id, { status: newStatus });
    return newStatus;
  },
});

// Delete personnel from roster
export const remove = mutation({
  args: {
    id: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const person = await ctx.db.get(args.id);
    if (person) {
      await ctx.db.insert("auditLogs", {
        userName: "Authorized Officer",
        userRole: "ADMIN",
        category: "PERSONNEL",
        action: "REMOVE_PERSONNEL",
        details: `Removed ${person.rank} ${person.firstName} ${person.lastName} from active roster`,
        ipAddress: "127.0.0.1",
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      });
    }
    await ctx.db.delete(args.id);
  },
});
