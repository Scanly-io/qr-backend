import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

interface ProtectedResource {
  id: string;
  resourceType: 'microsite' | 'page' | 'block';
  resourceId: string;
  passwordHash: string;
  hint?: string;
  maxAttempts?: number;
  attemptCount: number;
  lockedUntil?: Date;
  createdAt: Date;
  accessLog: Array<{
    timestamp: Date;
    success: boolean;
    ipAddress?: string;
  }>;
}

interface ExpiringContent {
  id: string;
  resourceType: 'microsite' | 'page' | 'block';
  resourceId: string;
  expiresAt: Date;
  redirectUrl?: string;
  showMessage?: string;
  autoArchive: boolean;
  createdAt: Date;
  isExpired: boolean;
}

// In-memory storage (in production, use database)
const protectedResources = new Map<string, ProtectedResource>();
const expiringContent = new Map<string, ExpiringContent>();

export async function accessControlRoutes(fastify: FastifyInstance) {
  // ========== PASSWORD PROTECTION ==========

  // Set password protection on a resource
  fastify.post('/protect', async (request, reply) => {
    const { resourceType, resourceId, password, hint, maxAttempts } = request.body as {
      resourceType: 'microsite' | 'page' | 'block';
      resourceId: string;
      password: string;
      hint?: string;
      maxAttempts?: number;
    };

    if (!resourceType || !resourceId || !password) {
      return reply.status(400).send({ error: 'resourceType, resourceId, and password are required' });
    }

    if (password.length < 4) {
      return reply.status(400).send({ error: 'Password must be at least 4 characters' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const protectionId = nanoid();

      const protection: ProtectedResource = {
        id: protectionId,
        resourceType,
        resourceId,
        passwordHash,
        hint,
        maxAttempts: maxAttempts || 5,
        attemptCount: 0,
        createdAt: new Date(),
        accessLog: [],
      };

      protectedResources.set(resourceId, protection);

      return {
        protectionId,
        resourceId,
        resourceType,
        hint,
        message: 'Password protection enabled',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to set password protection', message: error.message });
    }
  });

  // Verify password
  fastify.post('/verify', async (request, reply) => {
    const { resourceId, password, ipAddress } = request.body as {
      resourceId: string;
      password: string;
      ipAddress?: string;
    };

    if (!resourceId || !password) {
      return reply.status(400).send({ error: 'resourceId and password are required' });
    }

    const protection = protectedResources.get(resourceId);

    if (!protection) {
      return reply.status(404).send({ error: 'Resource not password protected' });
    }

    // Check if locked
    if (protection.lockedUntil && protection.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((protection.lockedUntil.getTime() - Date.now()) / 60000);
      return reply.status(429).send({
        error: 'Too many failed attempts',
        message: `Account locked. Try again in ${remainingMinutes} minutes`,
        lockedUntil: protection.lockedUntil,
      });
    }

    try {
      const isValid = await bcrypt.compare(password, protection.passwordHash);

      // Log access attempt
      protection.accessLog.push({
        timestamp: new Date(),
        success: isValid,
        ipAddress,
      });

      if (isValid) {
        // Reset attempt count on success
        protection.attemptCount = 0;
        protection.lockedUntil = undefined;

        // Generate access token
        const accessToken = nanoid(32);

        return {
          success: true,
          accessToken,
          resourceId,
          message: 'Access granted',
        };
      } else {
        // Increment failed attempts
        protection.attemptCount++;

        // Lock account if max attempts reached
        if (protection.maxAttempts && protection.attemptCount >= protection.maxAttempts) {
          protection.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }

        return reply.status(401).send({
          success: false,
          error: 'Invalid password',
          attemptsRemaining: protection.maxAttempts
            ? protection.maxAttempts - protection.attemptCount
            : undefined,
          hint: protection.hint,
        });
      }
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to verify password', message: error.message });
    }
  });

  // Remove password protection
  fastify.delete('/protect/:resourceId', async (request, reply) => {
    const { resourceId } = request.params as { resourceId: string };

    const existed = protectedResources.has(resourceId);
    protectedResources.delete(resourceId);

    return {
      success: existed,
      message: existed ? 'Password protection removed' : 'Resource was not protected',
    };
  });

  // Update password
  fastify.put('/protect/:resourceId', async (request, reply) => {
    const { resourceId } = request.params as { resourceId: string };
    const { newPassword, hint } = request.body as {
      newPassword: string;
      hint?: string;
    };

    const protection = protectedResources.get(resourceId);

    if (!protection) {
      return reply.status(404).send({ error: 'Resource not password protected' });
    }

    if (!newPassword || newPassword.length < 4) {
      return reply.status(400).send({ error: 'New password must be at least 4 characters' });
    }

    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      protection.passwordHash = passwordHash;
      protection.hint = hint;
      protection.attemptCount = 0;
      protection.lockedUntil = undefined;

      return {
        success: true,
        resourceId,
        message: 'Password updated successfully',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update password', message: error.message });
    }
  });

  // Get protection status
  fastify.get('/protect/:resourceId', async (request, reply) => {
    const { resourceId } = request.params as { resourceId: string };

    const protection = protectedResources.get(resourceId);

    if (!protection) {
      return {
        isProtected: false,
        resourceId,
      };
    }

    return {
      isProtected: true,
      resourceId,
      resourceType: protection.resourceType,
      hint: protection.hint,
      maxAttempts: protection.maxAttempts,
      isLocked: protection.lockedUntil ? protection.lockedUntil > new Date() : false,
      lockedUntil: protection.lockedUntil,
      accessLogCount: protection.accessLog.length,
    };
  });

  // ========== EXPIRING CONTENT ==========

  // Set expiration on content
  fastify.post('/expire', async (request, reply) => {
    const { resourceType, resourceId, expiresAt, redirectUrl, showMessage, autoArchive } = request.body as {
      resourceType: 'microsite' | 'page' | 'block';
      resourceId: string;
      expiresAt: string | Date; // ISO date string or Date
      redirectUrl?: string;
      showMessage?: string;
      autoArchive?: boolean;
    };

    if (!resourceType || !resourceId || !expiresAt) {
      return reply.status(400).send({ error: 'resourceType, resourceId, and expiresAt are required' });
    }

    const expiryDate = new Date(expiresAt);

    if (isNaN(expiryDate.getTime())) {
      return reply.status(400).send({ error: 'Invalid expiration date' });
    }

    if (expiryDate <= new Date()) {
      return reply.status(400).send({ error: 'Expiration date must be in the future' });
    }

    const expiringId = nanoid();

    const expiring: ExpiringContent = {
      id: expiringId,
      resourceType,
      resourceId,
      expiresAt: expiryDate,
      redirectUrl,
      showMessage: showMessage || 'This content has expired and is no longer available.',
      autoArchive: autoArchive !== false, // default true
      createdAt: new Date(),
      isExpired: false,
    };

    expiringContent.set(resourceId, expiring);

    return {
      expiringId,
      resourceId,
      resourceType,
      expiresAt: expiryDate,
      redirectUrl,
      autoArchive: expiring.autoArchive,
      message: 'Expiration set successfully',
    };
  });

  // Check if content is expired
  fastify.get('/expire/:resourceId', async (request, reply) => {
    const { resourceId } = request.params as { resourceId: string };

    const expiring = expiringContent.get(resourceId);

    if (!expiring) {
      return {
        hasExpiration: false,
        isExpired: false,
        resourceId,
      };
    }

    const isExpired = expiring.expiresAt <= new Date();

    // Update expired status
    if (isExpired && !expiring.isExpired) {
      expiring.isExpired = true;
    }

    return {
      hasExpiration: true,
      isExpired,
      resourceId,
      resourceType: expiring.resourceType,
      expiresAt: expiring.expiresAt,
      redirectUrl: expiring.redirectUrl,
      showMessage: expiring.showMessage,
      timeRemaining: isExpired ? 0 : expiring.expiresAt.getTime() - Date.now(),
    };
  });

  // Remove expiration
  fastify.delete('/expire/:resourceId', async (request, reply) => {
    const { resourceId } = request.params as { resourceId: string };

    const existed = expiringContent.has(resourceId);
    expiringContent.delete(resourceId);

    return {
      success: existed,
      message: existed ? 'Expiration removed' : 'Resource had no expiration',
    };
  });

  // Update expiration date
  fastify.put('/expire/:resourceId', async (request, reply) => {
    const { resourceId } = request.params as { resourceId: string };
    const { expiresAt, redirectUrl, showMessage } = request.body as {
      expiresAt?: string | Date;
      redirectUrl?: string;
      showMessage?: string;
    };

    const expiring = expiringContent.get(resourceId);

    if (!expiring) {
      return reply.status(404).send({ error: 'Resource has no expiration set' });
    }

    if (expiresAt) {
      const newExpiryDate = new Date(expiresAt);

      if (isNaN(newExpiryDate.getTime())) {
        return reply.status(400).send({ error: 'Invalid expiration date' });
      }

      expiring.expiresAt = newExpiryDate;
      expiring.isExpired = newExpiryDate <= new Date();
    }

    if (redirectUrl !== undefined) {
      expiring.redirectUrl = redirectUrl;
    }

    if (showMessage !== undefined) {
      expiring.showMessage = showMessage;
    }

    return {
      success: true,
      resourceId,
      expiresAt: expiring.expiresAt,
      redirectUrl: expiring.redirectUrl,
      showMessage: expiring.showMessage,
      message: 'Expiration updated successfully',
    };
  });

  // List all expiring content
  fastify.get('/expire/list/all', async (request, reply) => {
    const expiringList = Array.from(expiringContent.values()).map((exp) => ({
      id: exp.id,
      resourceType: exp.resourceType,
      resourceId: exp.resourceId,
      expiresAt: exp.expiresAt,
      isExpired: exp.expiresAt <= new Date(),
      autoArchive: exp.autoArchive,
      createdAt: exp.createdAt,
    }));

    const expired = expiringList.filter((e) => e.isExpired);
    const active = expiringList.filter((e) => !e.isExpired);

    return {
      total: expiringList.length,
      expired: expired.length,
      active: active.length,
      items: expiringList,
    };
  });

  // Cleanup expired content (run periodically)
  fastify.post('/expire/cleanup', async (request, reply) => {
    let cleaned = 0;

    for (const [resourceId, expiring] of expiringContent.entries()) {
      if (expiring.autoArchive && expiring.expiresAt <= new Date()) {
        expiringContent.delete(resourceId);
        cleaned++;
      }
    }

    return {
      cleaned,
      message: `Cleaned up ${cleaned} expired items`,
    };
  });
}
