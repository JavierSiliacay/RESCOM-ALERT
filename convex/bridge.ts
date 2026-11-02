import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Universal Dual-Database Sync Bridge.
 * Asynchronously mirrors mutations between deployments without blocking the main transaction.
 */
export const mirrorMutation = internalAction({
  args: {
    targetCloudUrl: v.string(),
    path: v.string(),
    args: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const res = await fetch(`${args.targetCloudUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: args.path,
          args: args.args,
          format: "json",
        }),
      });
      if (!res.ok) {
        console.warn(`Bridge mirror failed for ${args.path}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`Bridge network error for ${args.path}:`, err);
    }
  },
});
