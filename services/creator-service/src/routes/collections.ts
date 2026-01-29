import { FastifyInstance } from "fastify";
import { verifyJWT } from "@qr/common";
import { db } from "../db.js";
import { collections, products } from "../schema.js";
import { eq, and, desc } from "drizzle-orm";

export default async function collectionsRoutes(app: FastifyInstance) {

  // Get all collections for user
  app.get("/", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    
    const userCollections = await db.select()
      .from(collections)
      .where(eq(collections.userId, user.id))
      .orderBy(collections.displayOrder, desc(collections.createdAt));

    // Get product count for each collection
    const collectionsWithCounts = await Promise.all(
      userCollections.map(async (collection) => {
        const productCount = await db.select()
          .from(products)
          .where(eq(products.collectionId, collection.id));
        
        return {
          ...collection,
          productCount: productCount.length
        };
      })
    );

    return {
      success: true,
      collections: collectionsWithCounts
    };
  });

  // Create collection
  app.post("/", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { name, description, coverImage, isFeatured } = req.body;

    if (!name) {
      return res.code(400).send({ error: "Collection name required" });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const [collection] = await db.insert(collections)
      .values({
        userId: user.id,
        name,
        description: description || null,
        slug,
        coverImage: coverImage || null,
        isFeatured: isFeatured || false,
        isPublic: true
      })
      .returning();

    return {
      success: true,
      collection
    };
  });

  // Update collection
  app.patch("/:collectionId", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { collectionId } = req.params;
    const updates = req.body;

    const [updated] = await db.update(collections)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(collections.id, collectionId),
        eq(collections.userId, user.id)
      ))
      .returning();

    if (!updated) {
      return res.code(404).send({ error: "Collection not found" });
    }

    return { success: true, collection: updated };
  });

  // Reorder collections
  app.post("/reorder", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { collectionIds } = req.body; // Array of IDs in new order

    if (!Array.isArray(collectionIds)) {
      return res.code(400).send({ error: "collectionIds must be an array" });
    }

    // Update display order for each collection
    const updates = collectionIds.map((id, index) => 
      db.update(collections)
        .set({ displayOrder: index })
        .where(and(
          eq(collections.id, id),
          eq(collections.userId, user.id)
        ))
    );

    await Promise.all(updates);

    return { success: true };
  });

  // Delete collection
  app.delete("/:collectionId", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { collectionId } = req.params;

    // Check if collection has products
    const productsInCollection = await db.select()
      .from(products)
      .where(eq(products.collectionId, collectionId));

    if (productsInCollection.length > 0) {
      return res.code(400).send({ 
        error: "Cannot delete collection with products. Remove products first or they will be moved to 'Uncategorized'." 
      });
    }

    await db.delete(collections)
      .where(and(
        eq(collections.id, collectionId),
        eq(collections.userId, user.id)
      ));

    return { success: true };
  });

  // Get public collections (for storefront)
  app.get("/public/:userId", async (req: any, res) => {
    const { userId } = req.params;

    const userCollections = await db.select()
      .from(collections)
      .where(and(
        eq(collections.userId, userId),
        eq(collections.isPublic, true)
      ))
      .orderBy(collections.displayOrder);

    return {
      success: true,
      collections: userCollections
    };
  });
}
