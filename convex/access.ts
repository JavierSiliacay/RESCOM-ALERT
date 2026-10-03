import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to calculate expiration timestamp from duration string
export function calculateSuspensionExpiry(durationStr: string): number | undefined {
  const d = durationStr.toLowerCase().trim();
  if (d.includes("indefinite") || d.includes("until command")) {
    return undefined;
  }
  const now = Date.now();
  if (d.includes("24 hour") || d === "1 day" || d.includes("1 day")) {
    return now + 24 * 60 * 60 * 1000;
  }
  if (d.includes("3 day")) {
    return now + 3 * 24 * 60 * 60 * 1000;
  }
  if (d.includes("7 day") || d.includes("1 week")) {
    return now + 7 * 24 * 60 * 60 * 1000;
  }
  if (d.includes("14 day") || d.includes("2 week")) {
    return now + 14 * 24 * 60 * 60 * 1000;
  }
  if (d.includes("30 day") || d.includes("1 month")) {
    return now + 30 * 24 * 60 * 60 * 1000;
  }

  // Regex parser for custom duration inputs (e.g. "60 days", "12 hours", "3 months")
  const matchHours = d.match(/(\d+)\s*(hour|hr|h\b)/);
  if (matchHours) {
    return now + parseInt(matchHours[1], 10) * 60 * 60 * 1000;
  }
  const matchDays = d.match(/(\d+)\s*(day|d\b)/);
  if (matchDays) {
    return now + parseInt(matchDays[1], 10) * 24 * 60 * 60 * 1000;
  }
  const matchMonths = d.match(/(\d+)\s*(month|mo\b)/);
  if (matchMonths) {
    return now + parseInt(matchMonths[1], 10) * 30 * 24 * 60 * 60 * 1000;
  }

  return undefined;
}

// List all authorized officers
export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("authorizedUsers").collect();
    const now = Date.now();

    return users.map((u) => {
      if (u.email.toLowerCase().trim() === "siliacay.javier@gmail.com") {
        return {
          ...u,
          role: "DEVELOPER" as const,
          rank: u.rank === "COL" || !u.rank ? "System Developer" : u.rank,
          unit: u.unit === "10RCDG HQ" ? "10RCDG HQ / Technical Dev" : u.unit,
        };
      }

      // Check if temporary suspension has expired
      const isExpired =
        u.status === "SUSPENDED" &&
        u.suspendedUntil &&
        now >= (typeof u.suspendedUntil === "number" ? u.suspendedUntil : Date.parse(u.suspendedUntil));

      if (isExpired) {
        return {
          ...u,
          status: "ACTIVE" as const,
          suspendedReason: undefined,
          suspendedDuration: undefined,
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
    
    // Master Developer Email Exclusivity
    if (cleanEmail === "siliacay.javier@gmail.com") {
      return {
        isAuthorized: true,
        user: {
          name: "Javier Siliacay",
          email: "siliacay.javier@gmail.com",
          rank: "System Developer",
          role: "DEVELOPER" as const,
          unit: "10RCDG HQ / Technical Dev",
          status: "ACTIVE" as const,
        },
      };
    }

    // 1. Strictly check in authorizedUsers table
    const allUsers = await ctx.db.query("authorizedUsers").collect();
    const authorized = allUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (authorized) {
      const now = Date.now();
      const isExpired =
        authorized.status === "SUSPENDED" &&
        authorized.suspendedUntil &&
        now >= (typeof authorized.suspendedUntil === "number" ? authorized.suspendedUntil : Date.parse(authorized.suspendedUntil));

      // If suspension time has passed, automatically grant active access
      if (isExpired) {
        return {
          isAuthorized: true,
          user: {
            name: authorized.name,
            email: authorized.email,
            rank: authorized.rank,
            role: authorized.role,
            unit: authorized.unit,
            status: "ACTIVE" as const,
          },
        };
      }

      if (authorized.status === "SUSPENDED" || authorized.status === "REJECTED") {
        return {
          isAuthorized: false,
          user: {
            name: authorized.name,
            email: authorized.email,
            rank: authorized.rank,
            role: authorized.role,
            unit: authorized.unit,
            status: authorized.status,
            suspendedReason: authorized.suspendedReason,
            suspendedDuration: authorized.suspendedDuration,
            suspendedAt: authorized.suspendedAt,
            suspendedUntil: authorized.suspendedUntil,
          },
          reason: authorized.status,
        };
      }

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

    // Contacts/Members directory (personnel table) does NOT grant dashboard access
    return { isAuthorized: false, user: null, reason: "NOT_AUTHORIZED" };
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

// Suspend officer with specific reason and duration
export const suspendOfficer = mutation({
  args: {
    id: v.id("authorizedUsers"),
    reason: v.string(),
    duration: v.string(),
  },
  handler: async (ctx, args) => {
    const officer = await ctx.db.get(args.id);
    if (!officer) throw new Error("Officer not found");
    if (officer.email.toLowerCase().trim() === "siliacay.javier@gmail.com") {
      throw new Error("System Developer clearance cannot be suspended");
    }

    const now = new Date().toISOString();
    const suspendedUntilMs = calculateSuspensionExpiry(args.duration);

    await ctx.db.patch(args.id, {
      status: "SUSPENDED",
      suspendedReason: args.reason,
      suspendedDuration: args.duration,
      suspendedAt: now,
      suspendedUntil: suspendedUntilMs ? new Date(suspendedUntilMs).toISOString() : undefined,
    });

    const expiryNote = suspendedUntilMs ? ` (Auto-reactivates at: ${new Date(suspendedUntilMs).toLocaleString("en-US", { timeZone: "Asia/Manila" })})` : " (Indefinite)";

    await ctx.db.insert("auditLogs", {
      userName: "Group Commander",
      userRole: "COMMANDER",
      category: "AUTH",
      action: "SUSPEND_ACCESS",
      details: `Suspended ${officer.rank} ${officer.name} (${officer.email}) - Reason: "${args.reason}", Duration: "${args.duration}"${expiryNote}`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });
  },
});

// Reactivate a suspended officer
export const reactivateOfficer = mutation({
  args: {
    id: v.id("authorizedUsers"),
  },
  handler: async (ctx, args) => {
    const officer = await ctx.db.get(args.id);
    if (!officer) throw new Error("Officer not found");

    await ctx.db.patch(args.id, {
      status: "ACTIVE",
      suspendedReason: undefined,
      suspendedDuration: undefined,
      suspendedAt: undefined,
      suspendedUntil: undefined,
    });

    await ctx.db.insert("auditLogs", {
      userName: "Group Commander",
      userRole: "COMMANDER",
      category: "AUTH",
      action: "REINSTATE_ACCESS",
      details: `Reinstated active clearance for ${officer.rank} ${officer.name} (${officer.email})`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });
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

      // Auto-heal expired suspensions
      if (
        existing.status === "SUSPENDED" &&
        existing.suspendedUntil &&
        now >= (typeof existing.suspendedUntil === "number" ? existing.suspendedUntil : Date.parse(existing.suspendedUntil))
      ) {
        patchData.status = "ACTIVE";
        patchData.suspendedReason = undefined;
        patchData.suspendedDuration = undefined;
        patchData.suspendedAt = undefined;
        patchData.suspendedUntil = undefined;
      }

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
