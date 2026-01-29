import { db, users } from "../db.js";
import { generateAccessToken, verifyRefreshToken } from "@qr/common";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  refreshToken: z.string()
});

export default async function refreshRoutes(app: any) {
  app.post("/auth/refresh", {
    schema: {
      tags: ["Authentication"],
      description: "Refresh access token using refresh token",
      body: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string", description: "Valid refresh token" },
        },
      },
      response: {
        200: {
          description: "Token refreshed successfully",
          type: "object",
          properties: {
            accessToken: { type: "string", description: "New JWT access token (15min)" },
          },
        },
        400: {
          description: "Invalid input",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        401: {
          description: "Invalid or expired refresh token",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
  }, async (req: any, reply: any) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const { refreshToken } = parsed.data;

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Fetch user from database to ensure they still exist
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id)
      });

      if (!user) {
        return reply.code(401).send({ error: "User not found" });
      }

      // Generate new access token
      const accessToken = generateAccessToken({ id: user.id, email: user.email });

      reply.send({ accessToken });
    } catch (err) {
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }
  });
}
