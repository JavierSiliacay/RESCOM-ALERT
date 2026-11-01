import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertCallerAuthorized } from "./access";

// Fast, lightweight query for dropdown selects & filters (avoids scanning the personnel table)
export const listOptions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contactGroups").collect();
  },
});

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

// Bulk reassign selected personnel to another contact group
export const bulkReassignGroup = mutation({
  args: {
    personnelIds: v.array(v.id("personnel")),
    targetGroupId: v.id("contactGroups"),
    targetCompany: v.optional(v.string()),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "bulk reassign group");
    const targetGroup = await ctx.db.get(args.targetGroupId);
    if (!targetGroup) {
      throw new Error("Target contact group not found.");
    }

    const cleanEmail = (args.officerEmail || "").toLowerCase().trim();
    const allUsers = await ctx.db.query("authorizedUsers").collect();
    const callerUser = allUsers.find((u: any) => u.email.toLowerCase().trim() === cleanEmail);
    const officerName = callerUser?.name || "Command Staff";
    const officerRole = callerUser?.role || "ADMIN";
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });

    let transferredCount = 0;
    const sampleTroopNames: string[] = [];

    for (const pId of args.personnelIds) {
      const person = await ctx.db.get(pId);
      if (!person) continue;

      const updateData: Record<string, any> = {
        groupId: targetGroup._id,
        groupName: targetGroup.name,
        unit: targetGroup.unit || person.unit || "10RCDG",
        updatedAt: timestamp,
        updatedBy: officerName,
      };

      if (args.targetCompany !== undefined && args.targetCompany !== "") {
        updateData.company = args.targetCompany;
      }

      await ctx.db.patch(pId, updateData);
      transferredCount++;
      if (sampleTroopNames.length < 5) {
        sampleTroopNames.push(`${person.rank} ${person.lastName}`);
      }
    }

    // Insert Audit Log
    const sampleDisplay = sampleTroopNames.join(", ") + (transferredCount > 5 ? ` and ${transferredCount - 5} others` : "");
    await ctx.db.insert("auditLogs", {
      userName: officerName,
      userEmail: args.officerEmail,
      userRole: officerRole,
      category: "PERSONNEL",
      action: "BULK_REASSIGN_GROUP",
      details: `Transferred ${transferredCount} troops to ${targetGroup.name} (${sampleDisplay})`,
      ipAddress: "127.0.0.1",
      timestamp,
    });

    return {
      success: true,
      transferredCount,
      targetGroupName: targetGroup.name,
    };
  },
});

// Transfer ALL troops from one group to another in a single batch operation
export const transferEntireGroup = mutation({
  args: {
    sourceGroupId: v.id("contactGroups"),
    targetGroupId: v.id("contactGroups"),
    targetCompany: v.optional(v.string()),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "transfer entire group");
    const sourceGroup = await ctx.db.get(args.sourceGroupId);
    const targetGroup = await ctx.db.get(args.targetGroupId);
    if (!sourceGroup) throw new Error("Source contact group not found.");
    if (!targetGroup) throw new Error("Target contact group not found.");

    const cleanEmail = (args.officerEmail || "").toLowerCase().trim();
    const allUsers = await ctx.db.query("authorizedUsers").collect();
    const callerUser = allUsers.find((u: any) => u.email.toLowerCase().trim() === cleanEmail);
    const officerName = callerUser?.name || "Command Staff";
    const officerRole = callerUser?.role || "ADMIN";
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });

    const allPersonnel = await ctx.db.query("personnel").collect();
    const sourcePersonnel = allPersonnel.filter(
      (p) => p.groupId === sourceGroup._id || p.groupName === sourceGroup.name
    );

    for (const p of sourcePersonnel) {
      const updateData: Record<string, any> = {
        groupId: targetGroup._id,
        groupName: targetGroup.name,
        unit: targetGroup.unit || p.unit || "10RCDG",
        updatedAt: timestamp,
        updatedBy: officerName,
      };

      if (args.targetCompany !== undefined && args.targetCompany !== "") {
        updateData.company = args.targetCompany;
      }

      await ctx.db.patch(p._id, updateData);
    }

    // Also update any enlistment submissions referencing the source group
    const allSubmissions = await ctx.db.query("enlistmentSubmissions").collect();
    for (const s of allSubmissions) {
      if (s.groupId === sourceGroup._id || s.groupName === sourceGroup.name) {
        await ctx.db.patch(s._id, {
          groupId: targetGroup._id,
          groupName: targetGroup.name,
        });
      }
    }

    // Insert Audit Log
    await ctx.db.insert("auditLogs", {
      userName: officerName,
      userEmail: args.officerEmail,
      userRole: officerRole,
      category: "PERSONNEL",
      action: "TRANSFER_ENTIRE_GROUP",
      details: `Batch-transferred all ${sourcePersonnel.length} troops from ${sourceGroup.name} to ${targetGroup.name}`,
      ipAddress: "127.0.0.1",
      timestamp,
    });

    return {
      success: true,
      transferredCount: sourcePersonnel.length,
      sourceGroupName: sourceGroup.name,
      targetGroupName: targetGroup.name,
    };
  },
});
