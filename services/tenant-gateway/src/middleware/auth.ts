import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Simple JWT extraction middleware
 * In production, use proper JWT verification with jsonwebtoken or @fastify/jwt
 */
export async function extractAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    // Allow unauthenticated requests (they'll be rejected by downstream services if needed)
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // TODO: Replace with actual JWT verification
    // For now, assume token payload contains userId
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    // (request as any).userId = decoded.userId;

    // TEMPORARY: Extract userId from token payload (base64 decode middle part)
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      (request as any).userId = payload.userId || payload.sub;
    }
  } catch (error) {
    request.log.warn({ error }, 'JWT extraction failed');
  }
}
