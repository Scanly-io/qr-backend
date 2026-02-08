import { db, users } from "../db.js";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withDLQ } from "@qr/common";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export default async function signupRoutes(app: any) {
  app.post("/auth/signup", {
    schema: {
      tags: ["Authentication"],
      description: "Register a new user account",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", description: "User email address" },
          password: { type: "string", minLength: 8, description: "User password (min 8 characters)" },
        },
      },
      response: {
        201: {
          description: "User created successfully",
          type: "object",
          properties: {
            id: { type: "string", description: "User ID" },
            email: { type: "string", description: "User email" },
          },
        },
        400: {
          description: "Invalid input",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        409: {
          description: "Email already exists",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
  }, async (req:any, reply: any) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const { email, password } = parsed.data;

    const existsResult = await withDLQ(
      () => db.query.users.findFirst({ where: eq(users.email, email) }),
      { service: "auth", operation: "user.signup.check", metadata: { email } }
    );

    if (!existsResult.success) {
      return reply.code(500).send({ error: "Signup failed" });
    }

    if (existsResult.data) {
      return reply.code(409).send({ error: "Email already exists" });
    }

    const passwordHash = await argon2.hash(password);

    const insertResult = await withDLQ(
      () => db.insert(users).values({ email, passwordHash }).returning({ id: users.id, email: users.email }),
      { service: "auth", operation: "user.signup.create", metadata: { email } }
    );

    if (!insertResult.success) {
      return reply.code(500).send({ error: "Signup failed" });
    }

    reply.code(201).send(insertResult.data[0]);
  });
}
