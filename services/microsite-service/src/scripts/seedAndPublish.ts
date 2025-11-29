import { db } from "../db.js";
import { microsites } from "../schema.js";
import { generateJwtToken } from "@qr/common";
import { eq } from "drizzle-orm";

async function main() {
  const qrId = process.env.SEED_QR_ID || "publish-test-qr";
  const userId = process.env.SEED_USER_ID || "user_seed_1";
  const email = process.env.SEED_USER_EMAIL || "seed@example.com";

  // Generate JWT for this user (requires JWT_SECRET in env)
  const token = generateJwtToken({ sub: userId, email });
  console.log("JWT_TOKEN=", token);

  // Upsert microsite draft if not exists
  let existing: any[] = [];
  try {
    existing = await db.select().from(microsites).where(eq(microsites.qrId, qrId)).limit(1);
  } catch (err: any) {
    console.error("Microsites table missing. Run migrations (drizzle push) for microsite-service.");
    console.error(err.message);
    process.exit(1);
  }
  if (!existing.length) {
    await db.insert(microsites).values({
      qrId,
      title: "Publish Flow Test",
      description: "Draft before publish",
      createdBy: userId,
      layout: { blocks: [{ type: "header", text: "Hello" }] },
      theme: { color: "#3366ff" },
      links: [{ label: "Home", href: "https://example.com" }]
    });
    console.log("Inserted draft microsite", qrId);
  } else {
    console.log("Draft exists, proceeding to publish.");
  }

  console.log("To publish run (replace TOKEN): curl -H 'Authorization: Bearer " + token + "' -X POST http://localhost:3005/microsite/" + qrId + "/publish");
  console.log("Then view: http://localhost:3005/public/" + qrId);
}

main().catch(err => { console.error(err); process.exit(1); });
