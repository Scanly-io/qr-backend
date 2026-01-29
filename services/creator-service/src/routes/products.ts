import { FastifyInstance } from "fastify";
import { verifyJWT } from "@qr/common";
import { db } from "../db.js";
import { products, orders, earnings } from "../schema.js";
import { eq, and, desc } from "drizzle-orm";

export default async function productsRoutes(app: FastifyInstance) {

  // Get all products for user
  app.get("/", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;
    const { status, productType } = req.query as any;
    
    const conditions = [eq(products.userId, user.id)];
    
    if (status) {
      conditions.push(eq(products.status, status));
    }
    if (productType) {
      conditions.push(eq(products.productType, productType));
    }

    const userProducts = await db.select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt));

    return {
      success: true,
      products: userProducts
    };
  });

  // Create product
  app.post("/", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const {
      name,
      description,
      productType,
      price,
      currency,
      compareAtPrice,
      images,
      videoUrl,
      collectionId,
      downloadUrl,
      fileSize,
      courseUrl,
      lessonCount,
      bookingDuration,
      inventory,
      status
    } = req.body;

    if (!name || !productType || price === undefined) {
      return res.code(400).send({ error: "name, productType, and price required" });
    }

    const [product] = await db.insert(products)
      .values({
        userId: user.id,
        collectionId: collectionId || null,
        name,
        description: description || null,
        productType,
        price: price.toString(),
        currency: currency || 'USD',
        compareAtPrice: compareAtPrice ? compareAtPrice.toString() : null,
        images: images || [],
        videoUrl: videoUrl || null,
        downloadUrl: downloadUrl || null,
        fileSize: fileSize || null,
        courseUrl: courseUrl || null,
        lessonCount: lessonCount || null,
        bookingDuration: bookingDuration || null,
        inventory: inventory || null,
        status: status || 'draft',
        isPublic: false
      })
      .returning();

    return {
      success: true,
      product
    };
  });

  // Update product
  app.patch("/:productId", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { productId } = req.params;
    const updates = req.body;

    const [updated] = await db.update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(products.id, productId),
        eq(products.userId, user.id)
      ))
      .returning();

    if (!updated) {
      return res.code(404).send({ error: "Product not found" });
    }

    return { success: true, product: updated };
  });

  // Delete product
  app.delete("/:productId", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { productId } = req.params;

    await db.delete(products)
      .where(and(
        eq(products.id, productId),
        eq(products.userId, user.id)
      ));

    return { success: true };
  });

  // Get public products for storefront
  app.get("/public/:userId", async (req: any) => {
    const { userId } = req.params;
    const { collectionId } = req.query as any;

    const conditions = [
      eq(products.userId, userId),
      eq(products.isPublic, true),
      eq(products.status, 'active')
    ];

    if (collectionId) {
      conditions.push(eq(products.collectionId, collectionId));
    }

    const userProducts = await db.select()
      .from(products)
      .where(and(...conditions));

    return {
      success: true,
      products: userProducts
    };
  });

  // Get product analytics
  app.get("/analytics", { preHandler: [verifyJWT] }, async (req: any) => {
    const user = req.user;

    const userProducts = await db.select()
      .from(products)
      .where(eq(products.userId, user.id));

    const totalProducts = userProducts.length;
    const activeProducts = userProducts.filter(p => p.status === 'active').length;
    const totalSold = userProducts.reduce((sum, p) => sum + (p.soldCount || 0), 0);

    // Get recent orders
    const recentOrders = await db.select()
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    // Top selling products
    const topProducts = userProducts
      .filter(p => p.soldCount && p.soldCount > 0)
      .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
      .slice(0, 5);

    return {
      success: true,
      analytics: {
        totalProducts,
        activeProducts,
        draftProducts: totalProducts - activeProducts,
        totalSold,
        recentOrders,
        topProducts
      }
    };
  });

  // Create checkout session (Stripe integration placeholder)
  app.post("/:productId/checkout", async (req: any, res) => {
    const { productId } = req.params;
    const { customerEmail, customerName, quantity = 1 } = req.body;

    if (!customerEmail) {
      return res.code(400).send({ error: "customerEmail required" });
    }

    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product || !product.isPublic || product.status !== 'active') {
      return res.code(404).send({ error: "Product not available" });
    }

    // In production, create Stripe checkout session here
    const checkoutUrl = `https://checkout.stripe.com/mock-${Date.now()}`;

    return {
      success: true,
      checkoutUrl,
      product: {
        id: product.id,
        name: product.name,
        price: product.price
      }
    };
  });
}
