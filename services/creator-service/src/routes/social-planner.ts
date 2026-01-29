import { FastifyInstance } from "fastify";
import { verifyJWT } from "@qr/common";
import { db } from "../db.js";
import { scheduledPosts, socialAccounts } from "../schema.js";
import { eq, and, gte } from "drizzle-orm";

export default async function socialPlannerRoutes(app: FastifyInstance) {
  
  // Get all scheduled posts for user
  app.get("/posts", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    
    const posts = await db
      .select()
      .from(scheduledPosts)
      .where(eq(scheduledPosts.userId, user.id))
      .orderBy(scheduledPosts.scheduledFor);
    
    return { posts };
  });
  
  // Create scheduled post
  app.post("/posts", { preHandler: [verifyJWT] }, async (req: any, reply) => {
    const user = req.user;
    const { socialAccountId, caption, mediaUrls, scheduledFor, hashtags } = req.body;
    
    if (!socialAccountId || !caption || !scheduledFor) {
      return reply.code(400).send({ error: "socialAccountId, caption, and scheduledFor are required" });
    }
    
    // Verify social account belongs to user
    const account = await db
      .select()
      .from(socialAccounts)
      .where(and(
        eq(socialAccounts.id, socialAccountId),
        eq(socialAccounts.userId, user.id)
      ))
      .limit(1);
    
    if (!account.length) {
      return reply.code(404).send({ error: "Social account not found" });
    }
    
    const [post] = await db
      .insert(scheduledPosts)
      .values({
        userId: user.id,
        socialAccountId,
        caption,
        mediaUrls: mediaUrls || [],
        scheduledFor: new Date(scheduledFor),
        hashtags: hashtags || [],
        status: 'scheduled',
      })
      .returning();
    
    return { post };
  });
  
  // Update scheduled post
  app.patch("/posts/:id", { preHandler: [verifyJWT] }, async (req: any, reply) => {
    const user = req.user;
    const { id } = req.params;
    const updates = req.body;
    
    const [post] = await db
      .update(scheduledPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(scheduledPosts.id, id),
        eq(scheduledPosts.userId, user.id)
      ))
      .returning();
    
    if (!post) {
      return reply.code(404).send({ error: "Post not found" });
    }
    
    return { post };
  });
  
  // Delete scheduled post
  app.delete("/posts/:id", { preHandler: [verifyJWT] }, async (req: any, reply) => {
    const user = req.user;
    const { id } = req.params;
    
    const [post] = await db
      .delete(scheduledPosts)
      .where(and(
        eq(scheduledPosts.id, id),
        eq(scheduledPosts.userId, user.id)
      ))
      .returning();
    
    if (!post) {
      return reply.code(404).send({ error: "Post not found" });
    }
    
    return { message: "Post deleted" };
  });
  
  // Get calendar view (upcoming posts)
  app.get("/calendar", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    const now = new Date();
    
    const posts = await db
      .select()
      .from(scheduledPosts)
      .where(and(
        eq(scheduledPosts.userId, user.id),
        gte(scheduledPosts.scheduledFor, now)
      ))
      .orderBy(scheduledPosts.scheduledFor);
    
    return { posts };
  });
  
  // Get social accounts
  app.get("/accounts", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    
    const accounts = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, user.id));
    
    // Remove sensitive tokens from response
    const sanitized = accounts.map(acc => ({
      ...acc,
      accessToken: undefined,
      refreshToken: undefined,
    }));
    
    return { accounts: sanitized };
  });
}
