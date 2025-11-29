import { authGuard } from "@qr/common";
import { db } from "../db.js";
import { microsites } from "../schema.js";
import { eq } from "drizzle-orm";

export default async function micrositeRoutes(app: any) {

  // Get microsite
  app.get("/microsite/:qrId", { preHandler: [authGuard] } ,async (req: any, res: any) => {
    const { qrId } = req.params;
    const user = (req as any).user;

    const [site] = await db
      .select()
      .from(microsites)
      .where(eq(microsites.qrId, qrId))
      .limit(1);

    if (!site) return res.code(404).send({ message: "Microsite not found" });

    // Only enforce creator check if createdBy field exists on the record
    const createdBy = (site as any).createdBy;
    if (createdBy && createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden" });
    }

    return site;
  });

  // Update microsite draft (layout, theme, links)
  app.put("/microsite/:qrId", { preHandler: [authGuard] }, async (req: any, res: any) => {
    const { qrId } = req.params;
    const updates = req.body;
    const user = (req as any).user;
    
    const [site] = await db
      .select()
      .from(microsites)
      .where(eq(microsites.qrId, qrId))
      .limit(1);

    if (!site) return res.code(404).send({ message: "Microsite not found" });

    if (site.createdBy !== user.id) {
      return res.code(403).send({ error: "Forbidden" });
    }

    await db.update(microsites)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(microsites.qrId, qrId));

    return { message: "Microsite updated" };
  });

}
