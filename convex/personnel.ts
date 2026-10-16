import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertCallerAuthorized, assertCallerAuthorizedGroup } from "./access";

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
    deviceType: v.optional(v.union(v.literal("ANDROID"), v.literal("KEYPAD"), v.literal("IOS"))),
    createdBy: v.optional(v.string()),
    createdByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.createdByEmail, "create personnel");
    await assertCallerAuthorizedGroup(ctx, args.createdByEmail, [args.groupName], "create personnel");
    const creatorName = args.createdBy || "Authorized Officer";

    const id = await ctx.db.insert("personnel", {
      firstName: args.firstName,
      lastName: args.lastName,
      rank: args.rank,
      mobileNumber: args.mobileNumber,
      groupId: args.groupId,
      groupName: args.groupName,
      unit: args.unit,
      email: args.email,
      deviceType: args.deviceType || "ANDROID",
      status: "ACTIVE",
      createdAt: new Date().toISOString().split("T")[0],
      createdBy: creatorName,
    });

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: creatorName,
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
    deviceType: v.optional(v.union(v.literal("ANDROID"), v.literal("KEYPAD"), v.literal("IOS"))),
    updatedBy: v.optional(v.string()),
    updatedByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.updatedByEmail, "update personnel");
    const { id, ...data } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Personnel record not found");
    await assertCallerAuthorizedGroup(ctx, args.updatedByEmail, [data.groupName, existing.groupName], "update personnel");

    const editorName = data.updatedBy || "Authorized Officer";
    const updateTimestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await ctx.db.patch(id, {
      firstName: data.firstName,
      lastName: data.lastName,
      rank: data.rank,
      mobileNumber: data.mobileNumber,
      groupId: data.groupId || "",
      groupName: data.groupName,
      unit: data.unit,
      email: data.email || "",
      deviceType: data.deviceType || existing.deviceType || "ANDROID",
      updatedBy: editorName,
      updatedAt: updateTimestamp,
    });

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: editorName,
      userRole: "ADMIN",
      category: "PERSONNEL",
      action: "UPDATE_PERSONNEL",
      details: `Updated record for ${data.rank} ${data.firstName} ${data.lastName} (${data.mobileNumber})`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });
  },
});

// Update personnel device type (fast 1-click toggle)
export const setDeviceType = mutation({
  args: {
    id: v.id("personnel"),
    deviceType: v.union(v.literal("ANDROID"), v.literal("KEYPAD"), v.literal("IOS")),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "update personnel device type");
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Personnel record not found");
    await assertCallerAuthorizedGroup(ctx, args.officerEmail, [existing.groupName], "update personnel device type");

    await ctx.db.patch(args.id, { deviceType: args.deviceType });

    return { success: true };
  },
});

// Batch update personnel device type
export const batchSetDeviceType = mutation({
  args: {
    ids: v.array(v.id("personnel")),
    deviceType: v.union(v.literal("ANDROID"), v.literal("KEYPAD"), v.literal("IOS")),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "batch update personnel device type");
    for (const id of args.ids) {
      const person = await ctx.db.get(id);
      if (person) {
        await assertCallerAuthorizedGroup(ctx, args.officerEmail, [person.groupName], "batch update personnel device type");
        await ctx.db.patch(id, { deviceType: args.deviceType });
      }
    }
    return { count: args.ids.length };
  },
});

// Toggle active/inactive status
export const toggleStatus = mutation({
  args: {
    id: v.id("personnel"),
    updatedBy: v.optional(v.string()),
    updatedByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.updatedByEmail, "toggle personnel status");
    const person = await ctx.db.get(args.id);
    if (!person) throw new Error("Personnel not found");

    const newStatus = person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const officerName = args.updatedBy || "Authorized Officer";
    const updateTimestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await ctx.db.patch(args.id, {
      status: newStatus,
      updatedBy: officerName,
      updatedAt: updateTimestamp,
    });

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: officerName,
      userRole: "ADMIN",
      category: "PERSONNEL",
      action: newStatus === "ACTIVE" ? "ACTIVATE_PERSONNEL" : "DEACTIVATE_PERSONNEL",
      details: `Changed status of ${person.rank} ${person.firstName} ${person.lastName} (${person.mobileNumber}) to ${newStatus}`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });

    return newStatus;
  },
});

// Delete personnel from roster
export const remove = mutation({
  args: {
    id: v.id("personnel"),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCallerAuthorized(ctx, args.officerEmail, "remove personnel");
    const person = await ctx.db.get(args.id);
    if (person) {
      await assertCallerAuthorizedGroup(ctx, args.officerEmail, [person.groupName], "remove personnel");
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

// Helper: Normalize Philippine mobile number core 10 digits (e.g. 9XXXXXXXXX)
function normalizePhMobile(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("6309")) return digits.slice(3); // 9XXXXXXXXX
  if (digits.startsWith("639")) return digits.slice(2);  // 9XXXXXXXXX
  if (digits.startsWith("09")) return digits.slice(1);   // 9XXXXXXXXX
  if (digits.startsWith("9") && digits.length === 10) return digits;
  if (digits.length >= 10 && digits.slice(-10).startsWith("9")) {
    return digits.slice(-10);
  }
  return digits;
}

// Mobile Device Query: Verify if phone number is in active roster or pending enlistment
export const verifyMobile = query({
  args: {
    mobileNumber: v.string(),
    deviceId: v.optional(v.string()),
    isAuthorizedQr: v.optional(v.boolean()),
    // Set by the installed Android app. The APK cannot read the browser-side
    // device UUID bound during /download, so a number already bound through an
    // official channel (download/enlistment/QR) is accepted from the app.
    isNativeApp: v.optional(v.boolean()),
    // ANDROID_ID of the phone running the native app (one number = one phone)
    appDeviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const searchCore = normalizePhMobile(args.mobileNumber);
    if (searchCore.length < 7) {
      return { status: "INVALID_INPUT", message: "Invalid phone number length." };
    }

    // 0. OPSEC Gatekeeper: Check if portal verification is disabled by Command
    // Authorized individual Command QR codes bypass public portal lockout
    const portalSettings = await ctx.db.query("appPortalSettings").first();
    if (
      !args.isAuthorizedQr &&
      portalSettings &&
      (!portalSettings.isDownloadPortalEnabled || !portalSettings.allowRosterVerification)
    ) {
      return {
        status: "PORTAL_LOCKED",
        message:
          portalSettings.lockdownReason ||
          "Mobile roster verification is currently restricted by Command Headquarters (10RCDG).",
      };
    }

    // 1. Check Active Personnel Roster
    const allPersonnel = await ctx.db.query("personnel").collect();
    const matchedSoldier = allPersonnel.find((p) => {
      const pCore = normalizePhMobile(p.mobileNumber);
      return pCore === searchCore;
    });

    if (matchedSoldier) {
      // OPSEC & Anti-Impersonation Guard:
      // If the soldier already has an enrolled physical phone (appDeviceId or active hardware fcmToken)
      // and this verification attempt is NOT from their owner phone and NOT via an authorized Command QR:
      const isAlreadyBound = Boolean(
        matchedSoldier.appDeviceId ||
        (matchedSoldier.fcmToken && !matchedSoldier.fcmToken.startsWith("fcm_prov_"))
      );

      const isMismatchedDevice = Boolean(
        matchedSoldier.appDeviceId &&
        args.appDeviceId &&
        matchedSoldier.appDeviceId !== args.appDeviceId
      );

      // If already bound to another phone, immediately reject without exposing ANY soldier identity
      if (
        !args.isAuthorizedQr &&
        isAlreadyBound &&
        (isMismatchedDevice || (matchedSoldier.appDeviceId && !args.appDeviceId))
      ) {
        return {
          status: "DEVICE_MISMATCH",
          message:
            "This number is registered with an existing device. For security, personnel details are protected. Do not use a number if it's not your own. If this is your number and you changed your phone, contact your Unit Officer to unlink your old device.",
        };
      }

      return {
        status: "REGISTERED",
        isOwnerDevice: true,
        isDeviceBound: true,
        isAuthorizedQr: Boolean(args.isAuthorizedQr),
        soldier: {
          id: matchedSoldier._id,
          firstName: matchedSoldier.firstName,
          lastName: matchedSoldier.lastName,
          rank: matchedSoldier.rank,
          unit: matchedSoldier.unit,
          groupName: matchedSoldier.groupName,
          mobileNumber: matchedSoldier.mobileNumber,
          deviceType: matchedSoldier.deviceType || "ANDROID",
          fcmToken: matchedSoldier.fcmToken,
          deviceModel: matchedSoldier.deviceModel,
          boundDeviceId: matchedSoldier.boundDeviceId,
          lastDownloadedDeviceModel: matchedSoldier.lastDownloadedDeviceModel,
          previousDeviceModel: matchedSoldier.previousDeviceModel,
          lastDownloadedAt: matchedSoldier.lastDownloadedAt,
          appInstalledAt: matchedSoldier.appInstalledAt,
          lastActiveAt: matchedSoldier.lastActiveAt,
        },
      };
    }

    // 2. Check Enlistment Submissions (Pending applicants)
    const allSubmissions = await ctx.db.query("enlistmentSubmissions").collect();
    const matchedSubmission = allSubmissions.find((s) => {
      const sCore = normalizePhMobile(s.mobileNumber);
      return sCore === searchCore;
    });

    if (matchedSubmission) {
      const isApplicantDevice = Boolean(args.deviceId && matchedSubmission.deviceId === args.deviceId);
      return {
        status: "PENDING_ENLISTMENT",
        isOwnerDevice: isApplicantDevice,
        submission: isApplicantDevice
          ? {
              id: matchedSubmission._id,
              firstName: matchedSubmission.firstName,
              lastName: matchedSubmission.lastName,
              rank: matchedSubmission.rank,
              unit: matchedSubmission.unit,
              groupName: matchedSubmission.groupName,
              mobileNumber: matchedSubmission.mobileNumber,
              submissionStatus: matchedSubmission.status,
              submittedAt: matchedSubmission.submittedAt,
            }
          : undefined,
      };
    }

    return { status: "NOT_FOUND" };
  },
});

// Mobile Device Mutation: Link Android device push token & hardware model
export const linkDevice = mutation({
  args: {
    soldierId: v.id("personnel"),
    fcmToken: v.optional(v.string()),
    deviceModel: v.optional(v.string()),
    officerEmail: v.optional(v.string()),
    appDeviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.officerEmail) {
      await assertCallerAuthorized(ctx, args.officerEmail, "link device");
    }
    const soldier = await ctx.db.get(args.soldierId);
    if (!soldier) {
      throw new Error("Soldier record not found");
    }
    if (args.officerEmail) {
      await assertCallerAuthorizedGroup(ctx, args.officerEmail, [soldier.groupName], "link device");
    }

    const nowIso = new Date().toISOString();

    // Re-check hardware binding at write time (prevents race between verify and link)
    if (args.appDeviceId && soldier.appDeviceId && soldier.appDeviceId !== args.appDeviceId) {
      await ctx.db.insert("auditLogs", {
        userName: `${soldier.rank} ${soldier.firstName} ${soldier.lastName}`,
        userRole: "SECURITY_ALERT",
        category: "SECURITY",
        action: "UNAUTHORIZED_APP_PAIRING_BLOCKED",
        details: `Blocked app pairing for ${soldier.mobileNumber} from unrecognized phone (${args.deviceModel || "Unknown"}). Number is paired to: ${soldier.deviceModel || "another phone"}.`,
        ipAddress: "127.0.0.1",
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      });
      return { success: false, error: "DEVICE_MISMATCH" as const };
    }
    const token = args.fcmToken || soldier.fcmToken || `fcm_prov_${args.soldierId.slice(-8)}_${Date.now().toString(36)}`;
    const newModel = args.deviceModel || soldier.deviceModel || "Android Device";
    const isHardwareSwitch = Boolean(soldier.deviceModel && args.deviceModel && soldier.deviceModel !== args.deviceModel);
    const previousModel = isHardwareSwitch ? soldier.deviceModel : soldier.previousDeviceModel;

    await ctx.db.patch(args.soldierId, {
      fcmToken: token,
      deviceModel: newModel,
      deviceType: "ANDROID",
      previousDeviceModel: previousModel,
      lastDownloadedDeviceModel: newModel,
      appInstalledAt: soldier.appInstalledAt || nowIso,
      lastActiveAt: nowIso,
      ...(args.appDeviceId ? { appDeviceId: args.appDeviceId, boundDeviceId: soldier.boundDeviceId || args.appDeviceId } : {}),
    });

    if (isHardwareSwitch) {
      await ctx.db.insert("auditLogs", {
        userName: `${soldier.rank} ${soldier.firstName} ${soldier.lastName}`,
        userRole: "SOLDIER",
        category: "SECURITY",
        action: "DEVICE_TRANSFERRED",
        details: `Soldier transferred RESCOM pairing to new device: ${newModel}. Previously paired: ${soldier.deviceModel}.`,
        ipAddress: "127.0.0.1",
        timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      });
    }

    return {
      success: true,
      soldierId: args.soldierId,
      rank: soldier.rank,
      name: `${soldier.rank} ${soldier.firstName} ${soldier.lastName}`,
    };
  },
});

// Mobile Device Mutation: Batch Link Android devices for multiple troops
export const batchLinkDevices = mutation({
  args: {
    soldierIds: v.array(v.id("personnel")),
    deviceModel: v.optional(v.string()),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.officerEmail) {
      await assertCallerAuthorized(ctx, args.officerEmail, "batch link devices");
    }
    const nowIso = new Date().toISOString();
    let pairedCount = 0;

    for (const id of args.soldierIds) {
      const soldier = await ctx.db.get(id);
      if (soldier) {
        if (args.officerEmail) {
          await assertCallerAuthorizedGroup(ctx, args.officerEmail, [soldier.groupName], "batch link devices");
        }
        await ctx.db.patch(id, {
          fcmToken: soldier.fcmToken || `fcm_prov_${id.slice(-8)}_${Date.now().toString(36)}`,
          deviceModel: args.deviceModel || soldier.deviceModel || "Android Device (Provisioned)",
          deviceType: "ANDROID",
          appInstalledAt: soldier.appInstalledAt || nowIso,
          lastActiveAt: nowIso,
        });
        pairedCount++;
      }
    }

    return { success: true, count: pairedCount };
  },
});

// Mobile Device Mutation: Unlink device for damage, repair, or phone replacement
export const unlinkDevice = mutation({
  args: {
    soldierId: v.id("personnel"),
    reason: v.optional(v.string()),
    officerName: v.optional(v.string()),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.officerEmail) {
      await assertCallerAuthorized(ctx, args.officerEmail, "unlink device");
    }
    const soldier = await ctx.db.get(args.soldierId);
    if (!soldier) {
      throw new Error("Soldier record not found");
    }
    if (args.officerEmail) {
      await assertCallerAuthorizedGroup(ctx, args.officerEmail, [soldier.groupName], "unlink device");
    }

    const prevDevice = soldier.deviceModel || soldier.lastDownloadedDeviceModel || soldier.previousDeviceModel;
    const reasonText = args.reason || "Phone Damaged / Replacement Transfer";

    await ctx.db.patch(args.soldierId, {
      fcmToken: undefined,
      deviceModel: undefined,
      boundDeviceId: undefined,
      appDeviceId: undefined,
      lastActiveAt: undefined,
      ...(prevDevice ? { previousDeviceModel: prevDevice } : {}),
      lastDownloadedDeviceModel: undefined,
    });

    // Record OPSEC Audit Log
    await ctx.db.insert("auditLogs", {
      userName: args.officerName || "Authorized Officer",
      userRole: "ADMIN",
      category: "SECURITY",
      action: "DEVICE_UNPAIRED_FOR_TRANSFER",
      details: `Unpaired device (${prevDevice || "Android Phone"}) for ${soldier.rank} ${soldier.firstName} ${soldier.lastName} (${soldier.mobileNumber}). Reason: ${reasonText}. Ready for new phone replacement.`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });

    return {
      success: true,
      previousDevice: prevDevice,
      soldierName: `${soldier.rank} ${soldier.firstName} ${soldier.lastName}`,
    };
  },
});

// Mobile Device Mutation: Batch Unlink devices
export const batchUnlinkDevices = mutation({
  args: {
    soldierIds: v.array(v.id("personnel")),
    reason: v.optional(v.string()),
    officerName: v.optional(v.string()),
    officerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.officerEmail) {
      await assertCallerAuthorized(ctx, args.officerEmail, "batch unlink devices");
    }
    let unlinkedCount = 0;

    for (const id of args.soldierIds) {
      const soldier = await ctx.db.get(id);
      if (soldier) {
        if (args.officerEmail) {
          await assertCallerAuthorizedGroup(ctx, args.officerEmail, [soldier.groupName], "batch unlink devices");
        }
        const prev = soldier.deviceModel || soldier.lastDownloadedDeviceModel || soldier.previousDeviceModel;
        await ctx.db.patch(id, {
          fcmToken: undefined,
          deviceModel: undefined,
          boundDeviceId: undefined,
          appDeviceId: undefined,
          lastActiveAt: undefined,
          ...(prev ? { previousDeviceModel: prev } : {}),
          lastDownloadedDeviceModel: undefined,
        });
        unlinkedCount++;
      }
    }

    // Record audit log
    await ctx.db.insert("auditLogs", {
      userName: args.officerName || "Authorized Officer",
      userRole: "ADMIN",
      category: "SECURITY",
      action: "BATCH_DEVICE_UNPAIRED",
      details: `Batch unlinked ${unlinkedCount} soldier devices. Reason: ${args.reason || "Troop phone replacements"}.`,
      ipAddress: "127.0.0.1",
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    });

    return { success: true, count: unlinkedCount };
  },
});

// Mobile Device Query: Check if a previously paired phone is still authorized and linked
export const checkDevicePairing = query({
  args: {
    soldierId: v.id("personnel"),
    appDeviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const soldier = await ctx.db.get(args.soldierId);
    if (!soldier) {
      return { isPaired: false, reason: "NOT_FOUND" as const };
    }
    // If the administrator has cleared appDeviceId via unlinkDevice
    if (!soldier.appDeviceId) {
      return { isPaired: false, reason: "UNPAIRED_BY_ADMIN" as const };
    }
    // If the soldier profile was transferred to another phone
    if (soldier.appDeviceId !== args.appDeviceId) {
      return { isPaired: false, reason: "DEVICE_MISMATCH" as const };
    }
    return { isPaired: true };
  },
});

// Mobile Device Mutation: Heartbeat ping
export const heartbeat = mutation({
  args: {
    soldierId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const soldier = await ctx.db.get(args.soldierId);
    if (soldier) {
      await ctx.db.patch(args.soldierId, {
        lastActiveAt: new Date().toISOString(),
      });
    }
  },
});

