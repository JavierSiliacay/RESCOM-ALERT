import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contactGroups", {
      ...args,
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
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Delete contact group
export const remove = mutation({
  args: {
    id: v.id("contactGroups"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
