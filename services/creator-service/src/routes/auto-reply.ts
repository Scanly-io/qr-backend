import { FastifyInstance } from "fastify";
import { verifyJWT } from "@qr/common";
import { db } from "../db.js";
import { autoReplyRules, socialAccounts } from "../schema.js";
import { eq, and, desc } from "drizzle-orm";

export default async function autoReplyRoutes(app: FastifyInstance) {

  // Get all auto-reply rules
  app.get("/rules", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    
    const rules = await db.select()
      .from(autoReplyRules)
      .where(eq(autoReplyRules.userId, user.id))
      .orderBy(desc(autoReplyRules.createdAt));

    return {
      success: true,
      rules
    };
  });

  // Create auto-reply rule
  app.post("/rules", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const {
      socialAccountId,
      trigger,
      keywords,
      matchType,
      replyMessage,
      delaySeconds,
      maxRepliesPerDay
    } = req.body;

    if (!socialAccountId || !trigger || !replyMessage) {
      return res.code(400).send({ error: "Missing required fields" });
    }

    // Verify social account
    const [account] = await db.select()
      .from(socialAccounts)
      .where(and(
        eq(socialAccounts.id, socialAccountId),
        eq(socialAccounts.userId, user.id)
      ))
      .limit(1);

    if (!account) {
      return res.code(404).send({ error: "Social account not found" });
    }

    const [rule] = await db.insert(autoReplyRules)
      .values({
        userId: user.id,
        socialAccountId,
        trigger,
        keywords: keywords || [],
        matchType: matchType || 'contains',
        replyMessage,
        delaySeconds: delaySeconds || 0,
        maxRepliesPerDay: maxRepliesPerDay || 100,
        isActive: true
      })
      .returning();

    return {
      success: true,
      rule
    };
  });

  // Update auto-reply rule
  app.patch("/rules/:ruleId", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { ruleId } = req.params;
    const updates = req.body;

    const [updated] = await db.update(autoReplyRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(autoReplyRules.id, ruleId),
        eq(autoReplyRules.userId, user.id)
      ))
      .returning();

    if (!updated) {
      return res.code(404).send({ error: "Rule not found" });
    }

    return { success: true, rule: updated };
  });

  // Toggle rule active status
  app.patch("/rules/:ruleId/toggle", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { ruleId } = req.params;

    const [rule] = await db.select()
      .from(autoReplyRules)
      .where(and(
        eq(autoReplyRules.id, ruleId),
        eq(autoReplyRules.userId, user.id)
      ))
      .limit(1);

    if (!rule) {
      return res.code(404).send({ error: "Rule not found" });
    }

    const [updated] = await db.update(autoReplyRules)
      .set({ isActive: !rule.isActive, updatedAt: new Date() })
      .where(eq(autoReplyRules.id, ruleId))
      .returning();

    return { success: true, rule: updated };
  });

  // Delete auto-reply rule
  app.delete("/rules/:ruleId", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { ruleId } = req.params;

    await db.delete(autoReplyRules)
      .where(and(
        eq(autoReplyRules.id, ruleId),
        eq(autoReplyRules.userId, user.id)
      ));

    return { success: true };
  });

  // Get analytics for auto-replies
  app.get("/analytics", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;

    const rules = await db.select()
      .from(autoReplyRules)
      .where(eq(autoReplyRules.userId, user.id));

    const totalRules = rules.length;
    const activeRules = rules.filter(r => r.isActive).length;
    const totalReplies = rules.reduce((sum, r) => sum + (r.usageCount || 0), 0);

    return {
      success: true,
      analytics: {
        totalRules,
        activeRules,
        inactiveRules: totalRules - activeRules,
        totalReplies,
        topPerformingRules: rules
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
          .slice(0, 5)
      }
    };
  });
}
