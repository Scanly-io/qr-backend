import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { customDomains, domainVerificationLogs } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import dns from 'dns';
import { promisify } from 'util';
import { publishEvent } from '../kafka.js';

const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);

/**
 * POST /domains/:id/verify
 * 
 * Trigger DNS verification for a custom domain.
 * Checks CNAME and TXT records to confirm domain ownership.
 */
export default async function verifyDomainRoute(app: FastifyInstance) {
  app.post('/domains/:id/verify', {
    schema: {
      description: 'Verify domain DNS configuration',
      tags: ['domains'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
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

      // Publish event: domain verified or failed
      await publishEvent(
        verified ? 'domain.verified' : 'domain.failed',
        {
          eventType: verified ? 'domain.verified' : 'domain.failed',
          domainId: id,
          domain: domain.domain,
          userId: domain.userId,
          checks,
        }
      );

      return reply.send({
        success: verified,
        verificationStatus: newStatus,
        checks,
        message: verified 
          ? 'Domain verified successfully! Your custom domain is now active.'
          : 'Verification failed. Please check your DNS records and try again.',
      });
    } catch (error: any) {
      req.log.error(error, 'Error verifying custom domain');
      return reply.code(500).send({ error: 'Failed to verify custom domain' });
    }
  });
}
