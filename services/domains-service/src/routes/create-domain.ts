import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { customDomains, domainVerificationLogs } from '../schema.js';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { publishEvent } from '../kafka.js';

/**
 * POST /domains
 * 
 * Add a new custom domain for a QR code.
 * 
 * Body:
 * {
 *   domain: "scan.yourbrand.com",
 *   qrId: "qr-abc123" // Optional: null for root domain
 * }
 */
export default async function createDomainRoute(app: FastifyInstance) {
  app.post('/domains', {
    schema: {
      description: 'Add a new custom domain',
      tags: ['domains'],
      body: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: { type: 'string', description: 'Domain name (e.g., scan.yourbrand.com)' },
          qrId: { type: 'string', description: 'Optional QR code ID to link to' }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { domain, qrId } = req.body as any;
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

      // Validate domain format
      if (!domain || !domain.match(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i)) {
        return reply.code(400).send({ error: 'Invalid domain format' });
      }

      // Check if domain already exists
      const existing = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.domain, domain.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        return reply.code(409).send({ error: 'Domain already registered' });
      }

      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');

      // Create domain record
      const [newDomain] = await db
        .insert(customDomains)
        .values({
          userId,
          qrId: qrId || null,
          domain: domain.toLowerCase(),
          verificationToken,
          verificationStatus: 'pending',
          sslStatus: 'pending',
          isActive: false,
        })
        .returning();

      // Log verification attempt
      await db.insert(domainVerificationLogs).values({
        domainId: newDomain.id,
        verificationType: 'domain_added',
        result: 'pending',
        details: 'Domain added, awaiting DNS configuration',
      });

      // Publish event: domain created
      await publishEvent('domain.created', {
        eventType: 'domain.created',
        domainId: newDomain.id,
        domain: newDomain.domain,
        qrId: newDomain.qrId,
        userId,
        verificationToken: newDomain.verificationToken,
      });

      return reply.code(201).send({
        id: newDomain.id,
        domain: newDomain.domain,
        qrId: newDomain.qrId,
        verificationToken: newDomain.verificationToken,
        verificationStatus: newDomain.verificationStatus,
        dnsInstructions: {
          cname: {
            host: domain.toLowerCase(),
            value: process.env.PLATFORM_DOMAIN || 'proxy.yourplatform.com',
            ttl: 3600,
          },
          txt: {
            host: `_qr-verify.${domain.toLowerCase()}`,
            value: verificationToken,
            ttl: 3600,
          },
        },
      });
    } catch (error: any) {
      req.log.error(error, 'Error adding custom domain');
      return reply.code(500).send({ error: 'Failed to add custom domain' });
    }
  });
}
