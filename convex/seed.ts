import { mutation } from "./_generated/server";
import { INITIAL_PERSONNEL, INITIAL_GROUPS, PRESET_TEMPLATES } from "../src/lib/mock-data";

export const seedInitialData = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Check if groups already exist
    const existingGroups = await ctx.db.query("contactGroups").collect();
    if (existingGroups.length === 0) {
      for (const g of INITIAL_GROUPS) {
        await ctx.db.insert("contactGroups", {
          name: g.name,
          description: g.description,
          color: g.color,
          unit: g.unit,
          createdAt: new Date().toISOString().split("T")[0],
        });
      }
    }

    // 2. Check if personnel already exist
    const existingPersonnel = await ctx.db.query("personnel").collect();
    if (existingPersonnel.length === 0) {
      for (const p of INITIAL_PERSONNEL) {
        await ctx.db.insert("personnel", {
          firstName: p.firstName,
          lastName: p.lastName,
          rank: p.rank,
          mobileNumber: p.mobileNumber,
          groupName: p.groupName,
          unit: p.unit,
          status: p.status,
          email: p.email,
          createdAt: p.createdAt,
        });
      }
    }

    // 3. Check if templates already exist
    const existingTemplates = await ctx.db.query("templates").collect();
    if (existingTemplates.length === 0) {
      for (const t of PRESET_TEMPLATES) {
        await ctx.db.insert("templates", {
          title: t.title,
          category: t.category,
          text: t.text,
          createdAt: new Date().toISOString().split("T")[0],
        });
      }
    }

    // 4. Initial Commander Account
    const existingAuth = await ctx.db.query("authorizedUsers").collect();
    if (existingAuth.length === 0) {
      await ctx.db.insert("authorizedUsers", {
        name: "Javier Siliacay",
        email: "siliacay.javier@gmail.com",
        rank: "COL",
        role: "COMMANDER",
        unit: "10RCDG HQ",
        status: "ACTIVE",
        approvedDate: "2026-09-01",
        lastLogin: "Active Now",
      });
    }

    return { success: true, message: "Database seeded successfully!" };
  },
});
