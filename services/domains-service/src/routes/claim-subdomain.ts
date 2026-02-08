import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db.js';
import { subdomains } from '../schema.js';
import { eq } from 'drizzle-orm';
import { publishEvent } from '@qr/common';

/**
 * POST /subdomains/claim
 * 
 * Claim a free branded subdomain (e.g., username.scanly.io)
 * Similar to Linktree's username system
 */

const claimSubdomainSchema = z.object({
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(30, 'Subdomain must be at most 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]/, 'Subdomain must start with a letter or number')
    .regex(/[a-z0-9]$/, 'Subdomain must end with a letter or number')
    .refine(val => !val.includes('--'), 'Subdomain cannot contain consecutive hyphens'),
  defaultQrId: z.string().optional(),
});

// Reserved subdomains that cannot be claimed
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'app', 'dev', 'staging', 'prod', 'production',
  'test', 'demo', 'help', 'support', 'docs', 'blog', 'mail', 'email',
  'ftp', 'cdn', 'static', 'assets', 'media', 'files', 'download',
  'status', 'monitor', 'metrics', 'analytics', 'tracking',
  'security', 'abuse', 'legal', 'privacy', 'terms', 'about',
  'contact', 'sales', 'billing', 'payments', 'checkout',
  'account', 'profile', 'settings', 'dashboard', 'console',
  'login', 'signin', 'signup', 'register', 'auth', 'oauth',
  'scanly', 'qr', 'qrcode', 'link', 'links', 'url', 'short',
];

const claimSubdomain: FastifyPluginAsync = async (app) => {
  app.post('/subdomains/claim', {
    schema: {
      description: 'Claim a free branded subdomain (e.g., username.scanly.io)',
      tags: ['subdomains'],
      body: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: { type: 'string', minLength: 3, maxLength: 30 },
          defaultQrId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId || 'user-demo'; // From auth middleware
    
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const body = claimSubdomainSchema.parse(request.body);
    const requestedSubdomain = body.subdomain.toLowerCase();

    // Check if subdomain is reserved
    if (RESERVED_SUBDOMAINS.includes(requestedSubdomain)) {
      return reply.code(400).send({ 
        error: 'This subdomain is reserved and cannot be claimed',
        code: 'SUBDOMAIN_RESERVED'
      });
    }

    // Check if user already has a subdomain
    const existingUserSubdomain = await db
      .select()
      .from(subdomains)
      .where(eq(subdomains.userId, userId))
      .limit(1);

    if (existingUserSubdomain.length > 0) {
      return reply.code(400).send({ 
        error: 'You already have a subdomain claimed',
        existingSubdomain: existingUserSubdomain[0].subdomain,
        code: 'ALREADY_CLAIMED'
      });
    }

    // Check if subdomain is already taken
    const existingSubdomain = await db
      .select()
      .from(subdomains)
      .where(eq(subdomains.subdomain, requestedSubdomain))
      .limit(1);

    if (existingSubdomain.length > 0) {
      return reply.code(409).send({ 
        error: 'This subdomain is already taken',
        code: 'SUBDOMAIN_TAKEN'
      });
    }

    // Claim the subdomain
    const [newSubdomain] = await db
      .insert(subdomains)
      .values({
        userId,
        subdomain: requestedSubdomain,
        defaultQrId: body.defaultQrId || null,
        isActive: true,
        totalScans: '0',
      })
      .returning();

    // Publish event
    await publishEvent('subdomain.claimed', {
      subdomainId: newSubdomain.id,
      userId,
      subdomain: requestedSubdomain,
      url: `https://${requestedSubdomain}.${process.env.SUBDOMAIN_BASE || 'scanly.io'}`,
      claimedAt: new Date().toISOString(),
    });

    return reply.code(201).send({
      message: 'Subdomain claimed successfully',
      subdomain: newSubdomain,
      url: `https://${requestedSubdomain}.${process.env.SUBDOMAIN_BASE || 'scanly.io'}`,
    });
  });
};

export default claimSubdomain;
