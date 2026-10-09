import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertCallerAuthorized } from "./access";

// List all contact groups with dynamic member counts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("contactGroups").collect();
    const allPersonnel = await ctx.db.query("personnel").collect();

    return groups.map((g) => {
      const memberCount = allPersonnel.filter(
        (p) => p.groupId === g._id || p.groupName === g.name
      ).length;
      return {
        ...g,
        memberCount,
      };
    });
  },
});

// Create new contact group
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    color: v.string(),
    unit: v.string(),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "create contact group");
    const { officerEmail, ...data } = args;
    return await ctx.db.insert("contactGroups", {
      ...data,
      createdAt: new Date().toISOString().split("T")[0],
    });
  },
});

// Update contact group
export const update = mutation({
  args: {
    id: v.id("contactGroups"),
    name: v.string(),
    description: v.string(),
    color: v.string(),
    unit: v.string(),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "update contact group");
    const { id, officerEmail, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Delete contact group
export const remove = mutation({
  args: {
    id: v.id("contactGroups"),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "delete contact group");
    await ctx.db.delete(args.id);
  },
});
