import { db, users } from "../db.js";
import { generateAccessToken, verifyRefreshToken, withDLQ } from "@qr/common";
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

    let decoded: any;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }

    const result = await withDLQ(
      () => db.query.users.findFirst({ where: eq(users.id, decoded.id) }),
      { service: "auth", operation: "user.refresh.lookup", metadata: { userId: decoded.id } }
    );

    if (!result.success) {
      return reply.code(500).send({ error: "Token refresh failed" });
    }

    if (!result.data) {
      return reply.code(401).send({ error: "User not found" });
    }

    const accessToken = generateAccessToken({ id: result.data.id, email: result.data.email });

    reply.send({ accessToken });
  });
}
