import { FastifyInstance } from 'fastify';
import { db } from './db.js';
import { customDomains, domainRoutes, domainVerificationLogs } from './schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import dns from 'dns';
import { promisify } from 'util';
import { publishEvent } from './kafka.js';

const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);

/**
 * ==========================================
 * CUSTOM DOMAINS API ROUTES
 * ==========================================
 * 
 * Manages custom branded domains for QR codes.
 * Allows users to use their own domains (scan.yourbrand.com) instead of platform domain.
 * 
 * ENDPOINTS:
 * - POST /custom-domains - Add a new custom domain
 * - GET /custom-domains - List user's custom domains
 * - GET /custom-domains/:id - Get domain details
 * - POST /custom-domains/:id/verify - Trigger DNS verification
 * - PUT /custom-domains/:id - Update domain settings
 * - DELETE /custom-domains/:id - Remove domain
 * 
 * DOMAIN VERIFICATION FLOW:
 * 1. User adds domain
 * 2. System generates verification token
 * 3. User configures DNS:
 *    - CNAME: scan.yourbrand.com → yourplatform.com
 *    - TXT: _qr-verify.yourbrand.com → verification_token
 * 4. User clicks "Verify"
 * 5. System checks DNS records
 * 6. If valid, domain becomes active
 */

export default async function customDomainsRoutes(app: FastifyInstance) {
  
  /**
   * POST /custom-domains
   * 
   * Add a new custom domain for a QR code.
   * 
   * Body:
   * {
   *   domain: "scan.yourbrand.com",
   *   qrId: "qr-abc123" // Optional: null for root domain
   * }
   * 
   * Response:
   * {
   *   id: "uuid",
   *   domain: "scan.yourbrand.com",
   *   verificationToken: "abc123xyz",
   *   verificationStatus: "pending",
   *   dnsInstructions: {
   *     cname: { host: "scan.yourbrand.com", value: "proxy.yourplatform.com" },
   *     txt: { host: "_qr-verify.yourbrand.com", value: "abc123xyz" }
   *   }
   * }
   */
  app.post('/custom-domains', async (req, reply) => {
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
            value: 'proxy.yourplatform.com', // TODO: Use actual platform domain from config
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
      console.error('Error adding custom domain:', error);
      return reply.code(500).send({ error: 'Failed to add custom domain' });
    }
  });

  /**
   * GET /custom-domains
   * 
   * List all custom domains for authenticated user.
   * 
   * Response:
   * {
   *   domains: [
   *     {
   *       id: "uuid",
   *       domain: "scan.yourbrand.com",
   *       qrId: "qr-abc123",
   *       verificationStatus: "verified",
   *       sslStatus: "issued",
   *       isActive: true,
   *       createdAt: "2025-12-15T10:00:00Z"
   *     }
   *   ]
   * }
   */
  app.get('/custom-domains', async (req, reply) => {
    try {
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

      const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.userId, userId))
        .orderBy(desc(customDomains.createdAt));

      return reply.send({ domains });
    } catch (error: any) {
      console.error('Error fetching custom domains:', error);
      return reply.code(500).send({ error: 'Failed to fetch custom domains' });
    }
  });

  /**
   * GET /custom-domains/:id
   * 
   * Get detailed information about a specific custom domain.
   * Includes verification logs for debugging.
   */
  app.get('/custom-domains/:id', async (req, reply) => {
    try {
      const { id } = req.params as any;
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

      const [domain] = await db
        .select()
        .from(customDomains)
        .where(and(
          eq(customDomains.id, id),
          eq(customDomains.userId, userId)
        ))
        .limit(1);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Get verification logs
      const logs = await db
        .select()
        .from(domainVerificationLogs)
        .where(eq(domainVerificationLogs.domainId, id))
        .orderBy(desc(domainVerificationLogs.attemptedAt))
        .limit(10);

      // Get routing rules
      const routes = await db
        .select()
        .from(domainRoutes)
        .where(eq(domainRoutes.domainId, id))
        .orderBy(desc(domainRoutes.priority));

      return reply.send({ 
        domain,
        verificationLogs: logs,
        routes,
      });
    } catch (error: any) {
      console.error('Error fetching custom domain:', error);
      return reply.code(500).send({ error: 'Failed to fetch custom domain' });
    }
  });

  /**
   * POST /custom-domains/:id/verify
   * 
   * Trigger DNS verification for a custom domain.
   * Checks CNAME and TXT records to confirm domain ownership.
   * 
   * Response:
   * {
   *   success: true,
   *   verificationStatus: "verified",
   *   checks: {
   *     cname: { found: true, value: "proxy.yourplatform.com" },
   *     txt: { found: true, value: "abc123xyz" }
   *   }
   * }
   */
  app.post('/custom-domains/:id/verify', async (req, reply) => {
    try {
      const { id } = req.params as any;
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

      const [domain] = await db
        .select()
        .from(customDomains)
        .where(and(
          eq(customDomains.id, id),
          eq(customDomains.userId, userId)
        ))
        .limit(1);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Update status to verifying
      await db
        .update(customDomains)
        .set({ verificationStatus: 'verifying' })
        .where(eq(customDomains.id, id));

      const checks: any = {
        cname: { found: false, value: null, error: null },
        txt: { found: false, value: null, error: null },
      };

      // Check CNAME record
      try {
        const cnameRecords = await resolveCname(domain.domain);
        if (cnameRecords && cnameRecords.length > 0) {
          checks.cname.found = true;
          checks.cname.value = cnameRecords[0];
          
          // Log success
          await db.insert(domainVerificationLogs).values({
            domainId: id,
            verificationType: 'dns_cname',
            result: 'success',
            details: `CNAME record found: ${cnameRecords[0]}`,
          });
        }
      } catch (error: any) {
        checks.cname.error = error.message;
        
        // Log failure
        await db.insert(domainVerificationLogs).values({
          domainId: id,
          verificationType: 'dns_cname',
          result: 'failed',
          errorMessage: error.message,
        });
      }

      // Check TXT record for verification token
      try {
        const txtRecords = await resolveTxt(`_qr-verify.${domain.domain}`);
        if (txtRecords && txtRecords.length > 0) {
          const flatRecords = txtRecords.flat();
          const matchingToken = flatRecords.find(record => 
            record === domain.verificationToken
          );
          
          if (matchingToken) {
            checks.txt.found = true;
            checks.txt.value = matchingToken;
            
            // Log success
            await db.insert(domainVerificationLogs).values({
              domainId: id,
              verificationType: 'dns_txt',
              result: 'success',
              details: 'Verification token matched',
            });
          } else {
            checks.txt.error = 'Token mismatch';
            
            // Log failure
            await db.insert(domainVerificationLogs).values({
              domainId: id,
              verificationType: 'dns_txt',
              result: 'failed',
              errorMessage: 'Verification token does not match',
              details: `Expected: ${domain.verificationToken}, Found: ${flatRecords.join(', ')}`,
            });
          }
        }
      } catch (error: any) {
        checks.txt.error = error.message;
        
        // Log failure
        await db.insert(domainVerificationLogs).values({
          domainId: id,
          verificationType: 'dns_txt',
          result: 'failed',
          errorMessage: error.message,
        });
      }

      // Determine overall verification status
      const verified = checks.cname.found && checks.txt.found;
      const newStatus = verified ? 'verified' : 'failed';

      // Update domain status
      await db
        .update(customDomains)
        .set({
          verificationStatus: newStatus,
          lastVerifiedAt: new Date(),
          isActive: verified, // Auto-activate on successful verification
        })
        .where(eq(customDomains.id, id));

      return reply.send({
        success: verified,
        verificationStatus: newStatus,
        checks,
        message: verified 
          ? 'Domain verified successfully! Your custom domain is now active.'
          : 'Verification failed. Please check your DNS records and try again.',
      });
    } catch (error: any) {
      console.error('Error verifying custom domain:', error);
      return reply.code(500).send({ error: 'Failed to verify custom domain' });
    }
  });

  /**
   * DELETE /custom-domains/:id
   * 
   * Remove a custom domain.
   * This will stop routing traffic from that domain.
   */
  app.delete('/custom-domains/:id', async (req, reply) => {
    try {
      const { id } = req.params as any;
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

      const [domain] = await db
        .select()
        .from(customDomains)
        .where(and(
          eq(customDomains.id, id),
          eq(customDomains.userId, userId)
        ))
        .limit(1);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Delete domain (cascades to routes and logs)
      await db
        .delete(customDomains)
        .where(eq(customDomains.id, id));

      return reply.send({ 
        success: true,
        message: `Domain ${domain.domain} removed successfully`,
      });
    } catch (error: any) {
      console.error('Error deleting custom domain:', error);
      return reply.code(500).send({ error: 'Failed to delete custom domain' });
    }
  });

  /**
   * POST /custom-domains/:id/routes
   * 
   * Add a routing rule for path-based routing on a custom domain.
   * 
   * Body:
   * {
   *   pathPattern: "/lunch",
   *   matchType: "exact",
   *   qrId: "qr-menu-lunch",
   *   priority: 10
   * }
   */
  app.post('/custom-domains/:id/routes', async (req, reply) => {
    try {
      const { id } = req.params as any;
      const { pathPattern, matchType, qrId, priority } = req.body as any;
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

      // Verify domain ownership
      const [domain] = await db
        .select()
        .from(customDomains)
        .where(and(
          eq(customDomains.id, id),
          eq(customDomains.userId, userId)
        ))
        .limit(1);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Create routing rule
      const [route] = await db
        .insert(domainRoutes)
        .values({
          domainId: id,
          pathPattern,
          matchType: matchType || 'exact',
          qrId,
          priority: priority?.toString() || '100',
          isActive: true,
        })
        .returning();

      return reply.code(201).send({ route });
    } catch (error: any) {
      console.error('Error adding domain route:', error);
      return reply.code(500).send({ error: 'Failed to add domain route' });
    }
  });
}
