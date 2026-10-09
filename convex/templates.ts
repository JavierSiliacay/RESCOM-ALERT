import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertCallerAuthorized } from "./access";

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
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "create broadcast template");
    const { officerEmail, ...data } = args;
    return await ctx.db.insert("templates", {
      ...data,
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
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "update broadcast template");
    const { id, officerEmail, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

// Delete template
export const remove = mutation({
  args: {
    id: v.id("templates"),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "delete broadcast template");
    await ctx.db.delete(args.id);
  },
});
