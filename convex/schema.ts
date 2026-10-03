import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Personnel Roster
  personnel: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    rank: v.string(), // e.g. "BGEN", "COL", "LTC", "SGT", "PVT", etc.
    mobileNumber: v.string(), // e.g. "+639171234567"
    groupId: v.optional(v.string()), // ID of contact group
    groupName: v.string(),
    unit: v.string(), // e.g. "10RCDG HQ", "1001st CDC"
    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
    email: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_mobileNumber", ["mobileNumber"])
    .index("by_groupName", ["groupName"])
    .index("by_status", ["status"]),

  // Contact Groups / Units
  contactGroups: defineTable({
    name: v.string(),
    description: v.string(),
    color: v.string(),
    unit: v.string(),
    createdAt: v.string(),
  }).index("by_name", ["name"]),

  // Quick SMS Templates
  templates: defineTable({
    title: v.string(),
    category: v.string(),
    text: v.string(),
    createdBy: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_category", ["category"]),

  // Broadcast Transmissions & Outbox Logs
  broadcasts: defineTable({
    title: v.string(),
    content: v.string(),
    senderName: v.string(),
    senderEmail: v.optional(v.string()),
    senderRank: v.optional(v.string()),
    targetGroupNames: v.array(v.string()),
    recipients: v.array(v.string()), // Array of +639 mobile numbers
    totalRecipients: v.number(),
    deliveredCount: v.number(),
    failedCount: v.number(),
    status: v.union(v.literal("DELIVERED"), v.literal("SENDING"), v.literal("FAILED")),
    simSubscriptionId: v.optional(v.number()), // 1 for SIM 1, 2 for SIM 2
    gatewayBatchId: v.optional(v.string()),
    sentAt: v.string(),
  }).index("by_sentAt", ["sentAt"]),

  // Audit Logs (Security, Authentication, Operations)
  auditLogs: defineTable({
    userName: v.string(),
    userEmail: v.optional(v.string()),
    userRole: v.string(),
    action: v.string(),
    category: v.union(
      v.literal("AUTH"),
      v.literal("BROADCAST"),
      v.literal("PERSONNEL"),
      v.literal("SECURITY"),
      v.literal("CONFIG")
    ),
    details: v.string(),
    ipAddress: v.string(),
    timestamp: v.string(),
  })
    .index("by_category", ["category"])
    .index("by_timestamp", ["timestamp"]),

  // Authorized Access Accounts
  authorizedUsers: defineTable({
    name: v.string(),
    email: v.string(),
    rank: v.string(),
    role: v.union(
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
    approvedDate: v.string(),
    lastLogin: v.string(),
    lastSeenAt: v.optional(v.number()), // Unix timestamp in milliseconds for real-time live presence
  }).index("by_email", ["email"]),

  // Hardware Gateway Settings (Developer Config)
  gatewaySettings: defineTable({
    apiKey: v.string(),
    deviceId: v.string(),
    senderPrefix: v.string(),
    status: v.union(v.literal("ONLINE"), v.literal("STANDBY"), v.literal("OFFLINE")),
    phoneModel: v.string(),
    simCarrier: v.string(),
    simSubscriptionId: v.number(),
    updatedAt: v.string(),
  }),
});
