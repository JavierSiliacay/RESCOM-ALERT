import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all SMS broadcast templates
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("templates").order("desc").collect();
  },
});

// Create new template
export const create = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    text: v.string(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("templates", {
      ...args,
      createdAt: new Date().toISOString().split("T")[0],
    });
  },
});

// Update template
export const update = mutation({
  args: {
    id: v.id("templates"),
    title: v.string(),
    category: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Delete template
export const remove = mutation({
  args: {
    id: v.id("templates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
