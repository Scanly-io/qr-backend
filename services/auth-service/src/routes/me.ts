import { verifyJWT, withDLQ } from "@qr/common";
import { db, users } from "../db.js";
import { eq } from "drizzle-orm";

export default async function meRoutes(app: any) {
  app.get("/auth/me", {
    schema: {
      tags: ["Users"],
      description: "Get current authenticated user details",
      security: [{ bearerAuth: [] }],
      headers: {
        type: "object",
        properties: {
          authorization: { type: "string", description: "Bearer token" },
        },
        required: ["authorization"],
      },
      response: {
        200: {
          description: "User details",
          type: "object",
          properties: {
            id: { type: "string", description: "User ID" },
            email: { type: "string", description: "User email" },
          },
        },
        401: {
          description: "Unauthorized - invalid or missing token",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        404: {
          description: "User not found",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    preHandler: [verifyJWT], // Use the new JWT middleware
  }, async (req:any, reply: any) => {
    const userId = req.user.id;

    const result = await withDLQ(
      () => db.query.users.findFirst({ where: eq(users.id, userId) }),
      { service: "auth", operation: "user.me.lookup", metadata: { userId } }
    );

    if (!result.success) {
      return reply.code(500).send({ error: "Failed to fetch user" });
    }

    if (!result.data) {
      return reply.code(404).send({ error: "User not found" });
    }

    reply.send({ id: result.data.id, email: result.data.email });
  });
}
