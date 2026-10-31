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

// Delete contact group with automatic troop reassignment to prevent orphaned members
export const remove = mutation({
  args: {
    id: v.id("contactGroups"),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "delete contact group");
    const group = await ctx.db.get(args.id);
    if (!group) return;

    // Find a fallback group (prefer 1001st, RRIBn or first remaining group)
    const allGroups = await ctx.db.query("contactGroups").collect();
    const fallbackGroup =
      allGroups.find((g) => g._id !== args.id && g.name.includes("1001st")) ||
      allGroups.find((g) => g._id !== args.id);

    if (fallbackGroup) {
      // Reassign personnel in this group to fallback group
      const allPersonnel = await ctx.db.query("personnel").collect();
      for (const p of allPersonnel) {
        if (p.groupId === args.id || p.groupName === group.name) {
          await ctx.db.patch(p._id, {
            groupId: fallbackGroup._id,
            groupName: fallbackGroup.name,
            unit: fallbackGroup.unit || p.unit || "10RCDG",
            updatedAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
            updatedBy: "System (Group Deletion Reassignment)",
          });
        }
      }

      // Reassign enlistment submissions
      const allSubmissions = await ctx.db.query("enlistmentSubmissions").collect();
      for (const s of allSubmissions) {
        if (s.groupId === args.id || s.groupName === group.name) {
          await ctx.db.patch(s._id, {
            groupId: fallbackGroup._id,
            groupName: fallbackGroup.name,
          });
        }
      }
    }

    await ctx.db.delete(args.id);
  },
});
