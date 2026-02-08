import { db, users } from "../db.js";
import { generateAccessToken, generateRefreshToken, withDLQ } from "@qr/common";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string()
});

export default async function loginRoutes(app: any) {
  app.post("/auth/login", {
    schema: {
      tags: ["Authentication"],
      description: "Login with email and password",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", description: "User email address" },
          password: { type: "string", description: "User password" },
        },
      },
      response: {
        200: {
          description: "Login successful",
          type: "object",
          properties: {
            accessToken: { type: "string", description: "JWT access token (15min)" },
            refreshToken: { type: "string", description: "JWT refresh token (7d)" },
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
              },
            },
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
          description: "Invalid credentials",
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

    const { email, password } = parsed.data;

    const userResult = await withDLQ(
      () => db.query.users.findFirst({ where: eq(users.email, email) }),
      { service: "auth", operation: "user.login.lookup", metadata: { email } }
    );

    if (!userResult.success) {
      return reply.code(500).send({ error: "Login failed" });
    }

    const user = userResult.data;

    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    // Generate both access and refresh tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.id });

    reply.send({ 
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      }
    });
  });
}
