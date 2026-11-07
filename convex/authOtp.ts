import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Secret server-side salt for hashing OTPs (defense against rainbow tables)
const OTP_HASH_SALT = "rescom-auth-salt-928374";

// Master Developer & Commander Email
const DEVELOPER_EMAIL = "siliacay.javier@gmail.com";

// Helper: Cryptographic SHA-256 hash using native Web Crypto API in Convex
async function hashOtp(code: string, email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const rawString = `${normalized}:${code.trim()}:${OTP_HASH_SALT}`;
  const data = new TextEncoder().encode(rawString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates email eligibility, enforces rate limiting, generates cryptographic 6-digit code,
 * stores ONLY the SHA-256 hash in the database, and returns the code to the secure API handler
 * for Resend dispatch. Zero plaintext code is saved in Convex.
 */
export const prepareOtp = mutation({
  args: {
    email: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.toLowerCase().trim();

    // 1. Whitelist Verification: Must be Root Commander / Dev or Active in authorizedUsers
    let isAuthorized = cleanEmail === DEVELOPER_EMAIL;
    let officerName = isAuthorized ? "Group Commander / System Dev" : "Staff Officer";

    if (!isAuthorized) {
      const authUser = await ctx.db
        .query("authorizedUsers")
        .withIndex("by_email", (q) => q.eq("email", cleanEmail))
        .first();

      if (authUser && (authUser.status === "ACTIVE" || authUser.status === "APPROVED")) {
        isAuthorized = true;
        officerName = `${authUser.rank || "Officer"} ${authUser.name}`;
      }
    }

    if (!isAuthorized) {
      return {
        success: false,
        error: "UNAUTHORIZED",
        message: "This email address is not registered on the approved 10RCDG Command Roster.",
      };
    }

    // 2. Cooldown & Rate Limiting Check (60 seconds anti-flood)
    const existing = await ctx.db
      .query("authOtps")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();

    const now = Date.now();
    if (existing) {
      const elapsed = Math.floor((now - existing.requestedAt) / 1000);
      if (elapsed < 60) {
        return {
          success: false,
          error: "COOLDOWN",
          remainingSeconds: 60 - elapsed,
          message: `Please wait ${60 - elapsed} seconds before requesting another code.`,
        };
      }
      // Delete previous OTP record before creating a new one
      await ctx.db.delete(existing._id);
    }

    // 3. Cryptographically secure 6-digit code generation
    // Generates integer between 100000 and 999999
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const codeNumber = 100000 + (randomArray[0] % 900000);
    const plainCode = codeNumber.toString();

    // 4. One-Way SHA-256 Hashing (Zero Plaintext Stored)
    const hashed = await hashOtp(plainCode, cleanEmail);

    // 5. Store hashed OTP in database with 5-minute strict TTL (300,000 ms)
    await ctx.db.insert("authOtps", {
      email: cleanEmail,
      hashedOtp: hashed,
      expiresAt: now + 5 * 60 * 1000,
      attempts: 0,
      requestedAt: now,
      ipAddress: args.ipAddress,
    });

    return {
      success: true,
      plainCode, // Returned ONLY to secure server action for immediate dispatch via Resend
      officerName,
      email: cleanEmail,
    };
  },
});

/**
 * Validates submitted OTP against stored hash, applies 3-attempt brute-force self-destruct,
 * and executes Burn-on-Read (instant deletion upon success).
 */
export const verifyAndBurnOtp = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.toLowerCase().trim();
    const cleanCode = args.code.trim();

    const record = await ctx.db
      .query("authOtps")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();

    const now = Date.now();

    if (!record) {
      return {
        success: false,
        error: "NOT_FOUND",
        message: "This security code has already been used or has expired. For your security, each code can only be used once. Please request a new code.",
      };
    }

    // 1. Expiration Check (5-minute TTL)
    if (now >= record.expiresAt) {
      await ctx.db.delete(record._id);
      return {
        success: false,
        error: "EXPIRED",
        message: "Your security code has expired (5-minute limit). Please request a new code.",
      };
    }

    // 2. 3-Strike Brute-Force Self-Destruct Protection
    if (record.attempts >= 3) {
      await ctx.db.delete(record._id);
      return {
        success: false,
        error: "LOCKED",
        message: "Too many failed attempts. For security, this code was destroyed. Please request a new code.",
      };
    }

    // 3. Hash Comparison
    const inputHash = await hashOtp(cleanCode, cleanEmail);

    if (inputHash === record.hashedOtp) {
      // 4. Burn-On-Read: Permanently erase the OTP upon successful login
      await ctx.db.delete(record._id);

      return {
        success: true,
        message: "Security code verified.",
      };
    } else {
      // Incorrect attempt: increment counter
      const newAttempts = record.attempts + 1;
      if (newAttempts >= 3) {
        // Self-destruct immediately on 3rd failure!
        await ctx.db.delete(record._id);
        return {
          success: false,
          error: "LOCKED",
          message: "Incorrect code. Maximum attempts exceeded. Code destroyed for security.",
        };
      } else {
        await ctx.db.patch(record._id, { attempts: newAttempts });
        const remaining = 3 - newAttempts;
        return {
          success: false,
          error: "INVALID",
          remainingAttempts: remaining,
          message: `Incorrect security code. ${remaining} attempt(s) remaining.`,
        };
      }
    }
  },
});

