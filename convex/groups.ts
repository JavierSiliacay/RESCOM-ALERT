import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertCallerAuthorized } from "./access";

// Helper to adjust memberCount of a contactGroup by delta (+1 or -1)
export async function adjustGroupMemberCount(
  ctx: any,
  groupId: string | undefined,
  groupName: string | undefined,
  delta: number
) {
  if (groupId) {
    try {
      const group = await ctx.db.get(groupId);
      if (group) {
        const current = group.memberCount ?? 0;
        await ctx.db.patch(group._id, { memberCount: Math.max(0, current + delta) });
        return;
      }
    } catch {
      // Invalid ID, fall back to groupName lookup below
    }
  }
  if (groupName) {
    const group = await ctx.db
      .query("contactGroups")
      .withIndex("by_name", (q: any) => q.eq("name", groupName))
      .first();
    if (group) {
      const current = group.memberCount ?? 0;
      await ctx.db.patch(group._id, { memberCount: Math.max(0, current + delta) });
    }
  }
}

// Fast, lightweight query for dropdown selects & filters (avoids scanning the personnel table)
export const listOptions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contactGroups").collect();
  },
});

// List all contact groups with precomputed member counts (zero personnel table scans)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("contactGroups").collect();
    return groups.map((g) => ({
      ...g,
      memberCount: g.memberCount ?? 0,
    }));
  },
});

// One-time / repair synchronization to compute and store member counts on contactGroups
export const syncMemberCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("contactGroups").collect();
    const allPersonnel = await ctx.db.query("personnel").collect();

    let updated = 0;
    for (const g of groups) {
      const memberCount = allPersonnel.filter(
        (p) => p.groupId === g._id || p.groupName === g.name
      ).length;
      await ctx.db.patch(g._id, { memberCount });
      updated++;
    }
    return { success: true, updated };
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
      memberCount: 0,
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
      // Reassign personnel in this group to fallback group using by_groupName index
      const targetPersonnel = await ctx.db
        .query("personnel")
        .withIndex("by_groupName", (q) => q.eq("groupName", group.name))
        .collect();
      for (const p of targetPersonnel) {
        await ctx.db.patch(p._id, {
          groupId: fallbackGroup._id,
          groupName: fallbackGroup.name,
          unit: fallbackGroup.unit || p.unit || "10RCDG",
          updatedAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
          updatedBy: "System (Group Deletion Reassignment)",
        });
      }

      await ctx.db.patch(fallbackGroup._id, {
        memberCount: (fallbackGroup.memberCount ?? 0) + targetPersonnel.length,
      });

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
      // Adjust source group count down
      await adjustGroupMemberCount(ctx, person.groupId, person.groupName, -1);
      transferredCount++;
      if (sampleTroopNames.length < 5) {
        sampleTroopNames.push(`${person.rank} ${person.lastName}`);
      }
    }

    // Adjust target group count up
    if (transferredCount > 0) {
      await adjustGroupMemberCount(ctx, targetGroup._id, targetGroup.name, transferredCount);
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
    const callerUser =
      (await ctx.db
        .query("authorizedUsers")
        .withIndex("by_email", (q: any) => q.eq("email", cleanEmail))
        .first()) ||
      (await ctx.db.query("authorizedUsers").collect()).find(
        (u: any) => u.email.toLowerCase().trim() === cleanEmail
      );
    const officerName = callerUser?.name || "Command Staff";
    const officerRole = callerUser?.role || "ADMIN";
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });

    const sourcePersonnel = await ctx.db
      .query("personnel")
      .withIndex("by_groupName", (q) => q.eq("groupName", sourceGroup.name))
      .collect();

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

    // Update cached group counts
    await ctx.db.patch(sourceGroup._id, { memberCount: 0 });
    await ctx.db.patch(targetGroup._id, {
      memberCount: (targetGroup.memberCount ?? 0) + sourcePersonnel.length,
    });

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
