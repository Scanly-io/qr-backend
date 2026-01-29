import jwt, { Jwt, SignOptions } from "jsonwebtoken"; 
import { FastifyReply, FastifyRequest } from "fastify";

// Helper functions to get environment variables (lazy evaluation)
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET not set");
  }
  return secret;
};

const getJwtRefreshSecret = () => {
  return process.env.JWT_REFRESH_SECRET || getJwtSecret(); // Fallback to JWT_SECRET if not set
};

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
export const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || "7d";

export interface JwtPayload {
    sub: string;
    email: string;
}

export interface JwtToken extends Jwt {
  payload: JwtPayload;
}   

// Legacy function - kept for backward compatibility
export function generateJwtToken(payload: JwtPayload): string {
    const secret = getJwtSecret();
    const opts: SignOptions = { expiresIn: JWT_EXPIRES_IN } as SignOptions;
    return jwt.sign(payload as any, secret, opts);
}

// -----------------------
// Generate access token (new pattern with id + email)
// -----------------------
export function generateAccessToken(payload: { id: string; email: string }): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

// -----------------------
// Generate refresh token (only stores id)
// -----------------------
export function generateRefreshToken(payload: { id: string }): string {
  const secret = getJwtRefreshSecret();
  return jwt.sign(payload, secret, {
    expiresIn: REFRESH_EXPIRES_IN,
  } as SignOptions);
}

// -----------------------
// Verify Access Token
// -----------------------
export function verifyAccessToken(token: string): { id: string; email: string } {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as { id: string; email: string };
}

// -----------------------
// Verify Refresh Token
// -----------------------
export function verifyRefreshToken(token: string): { id: string } {
  const secret = getJwtRefreshSecret();
  return jwt.verify(token, secret) as { id: string };
}

// -----------------------
// Fastify Middleware
// -----------------------
export async function verifyJWT(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Unauthorized" });
    return;
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    (req as any).user = decoded; // Attach user to request
  } catch (err) {
    reply.code(401).send({ error: "Invalid or expired token" });
  }
}

export function verifyJwtToken(token: string): JwtPayload {
    const secret = getJwtSecret();
    try {
        return jwt.verify(token, secret) as JwtPayload;
    } catch {
        throw new Error("Invalid or expired token");
    }
}
