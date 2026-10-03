import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all authorized officers
export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("authorizedUsers").collect();
    return users.map((u) => {
      if (u.email.toLowerCase().trim() === "siliacay.javier@gmail.com") {
        return {
          ...u,
          role: "DEVELOPER" as const,
          rank: u.rank === "COL" || !u.rank ? "System Developer" : u.rank,
          unit: u.unit === "10RCDG HQ" ? "10RCDG HQ / Technical Dev" : u.unit,
        };
      }
      return u;
    });
  },
});

// Check if user is authorized by email (case-insensitive)
export const checkByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.toLowerCase().trim();
    
    // 1. Check in authorizedUsers table
    const allUsers = await ctx.db.query("authorizedUsers").collect();
    const authorized = allUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (authorized) {
      return {
        isAuthorized: true,
        user: {
          name: authorized.name,
          email: authorized.email,
          rank: authorized.rank,
          role: authorized.role,
          unit: authorized.unit,
          status: authorized.status,
        },
      };
    }

    // 2. Check if registered in personnel roster with email
    const allPersonnel = await ctx.db.query("personnel").collect();
    const person = allPersonnel.find((p) => p.email && p.email.toLowerCase().trim() === cleanEmail);
    if (person && person.status === "ACTIVE") {
      return {
        isAuthorized: true,
        user: {
          name: `${person.firstName} ${person.lastName}`,
          email: person.email,
          rank: person.rank,
          role: "OPERATOR",
          unit: person.unit,
          status: "ACTIVE",
        },
      };
    }

    return { isAuthorized: false, user: null };
  },
});

// Authorize new officer
export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    rank: v.string(),
    role: v.union(
      v.literal("DEVELOPER"),
      v.literal("COMMANDER"),
      v.literal("ADMIN"),
      v.literal("OPERATOR"),
      v.literal("VIEWER")
    ),
    unit: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.toLowerCase().trim();
    const existing = await ctx.db
      .query("authorizedUsers")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        rank: args.rank,
        role: args.role,
        unit: args.unit,
        status: "ACTIVE",
      });
      return existing._id;
    }

    const id = await ctx.db.insert("authorizedUsers", {
      ...args,
      email: cleanEmail,
      status: "ACTIVE",
      approvedDate: new Date().toISOString().split("T")[0],
      lastLogin: "Never",
    });

    await ctx.db.insert("auditLogs", {
      userName: "Group Commander",
      userRole: "COMMANDER",
      category: "AUTH",
      action: "GRANT_ACCESS",
      details: `Authorized ${args.rank} ${args.name} (${cleanEmail}) with role ${args.role}`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });

    return id;
  },
});

// Comprehensive update of officer details, role, and clearance
export const update = mutation({
  args: {
    id: v.id("authorizedUsers"),
    name: v.string(),
    email: v.string(),
    rank: v.string(),
    role: v.union(
      v.literal("DEVELOPER"),
      v.literal("COMMANDER"),
      v.literal("ADMIN"),
      v.literal("OPERATOR"),
      v.literal("VIEWER")
    ),
    unit: v.string(),
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
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Officer record not found");

    await ctx.db.patch(id, {
      ...data,
      email: data.email.toLowerCase().trim(),
    });

    await ctx.db.insert("auditLogs", {
      userName: "Authorized Officer",
      userRole: "ADMIN",
      category: "AUTH",
      action: "UPDATE_ACCESS",
      details: `Updated clearance for ${data.rank} ${data.name} (${data.email}) - Role: ${data.role}, Status: ${data.status}`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });
  },
});

// Update officer role or clearance status
export const updateRole = mutation({
  args: {
    id: v.id("authorizedUsers"),
    role: v.union(
      v.literal("DEVELOPER"),
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
    const officer = await ctx.db.get(args.id);
    if (officer) {
      await ctx.db.insert("auditLogs", {
        userName: "Group Commander",
        userRole: "COMMANDER",
        category: "AUTH",
        action: "REVOKE_ACCESS",
        details: `Revoked access for ${officer.rank} ${officer.name} (${officer.email})`,
        ipAddress: "127.0.0.1",
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      });
    }
    await ctx.db.delete(args.id);
  },
});

// Live presence heartbeat: Updates lastSeenAt timestamp for an active user
export const heartbeat = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    rank: v.optional(v.string()),
    unit: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("DEVELOPER"),
        v.literal("COMMANDER"),
        v.literal("ADMIN"),
        v.literal("OPERATOR"),
        v.literal("VIEWER")
      )
    ),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.toLowerCase().trim();
    const now = Date.now();

    const allUsers = await ctx.db.query("authorizedUsers").collect();
    const existing = allUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);

    if (existing) {
      const patchData: any = {
        lastSeenAt: now,
        lastLogin: "Active Now",
      };
      if (cleanEmail === "siliacay.javier@gmail.com") {
        patchData.role = "DEVELOPER";
        patchData.rank = "System Developer";
        patchData.unit = "10RCDG HQ / Technical Dev";
      }
      await ctx.db.patch(existing._id, patchData);
      return existing._id;
    }

    return null;
  },
});
