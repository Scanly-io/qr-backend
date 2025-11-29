import { db } from "../db.js";
import { microsites } from "../schema.js";
import { eq } from "drizzle-orm";

async function main() {
  const qrId = process.env.QR_ID || "publish-test-qr";
  const createdBy = process.env.USER_ID || "e9fc13eb-75ba-44b3-8fdc-1bc70213b33e";
  const existing = await db.select().from(microsites).where(eq(microsites.qrId, qrId));
  if (existing.length) {
    console.log("Draft already exists", existing[0].id);
    return;
  }
  await db.insert(microsites).values({
    qrId,
    title: "Publish Flow",
    description: "Draft microsite",
    createdBy,
    theme: { background: "#f0f4ff", textColor: "#222" },
    links: [{ label: "Docs", url: "https://example.com" }],
    layout: [{ type: "text", value: "Hello world from publish flow" }]
  });
  console.log("Inserted draft microsite", qrId);
}

main().catch(e => { console.error(e); process.exit(1); });
