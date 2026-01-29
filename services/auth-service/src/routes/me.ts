import { verifyJWT } from "@qr/common";
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
    try {
      // The user is now attached to req.user by the verifyJWT middleware
      const userId = req.user.id;

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) return reply.code(404).send({ error: "User not found" });

      reply.send({ id: user.id, email: user.email });
    } catch {
      return reply.code(401).send({ error: "Invalid token" });
    }
  });
}
