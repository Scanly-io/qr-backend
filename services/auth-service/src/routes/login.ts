import { db, users } from "../db.js";
import { generateJwtToken } from "@qr/common";
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
            token: { type: "string", description: "JWT authentication token" },
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

    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

  const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

  const token = generateJwtToken({ sub: user.id, email: user.email });
  reply.send({ token });
  });
}
