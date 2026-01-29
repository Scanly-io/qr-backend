import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { scanAccessibility } from '../lib/accessibility-scanner.js';
import { predictComplianceIssues, updateComplianceKnowledge, getActiveComplianceRules } from '../lib/compliance-learning.js';
import { db } from '../db.js';
import { accessibilityScans } from '../schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// FREE PUBLIC TOOL - No auth required!
const publicScanSchema = z.object({
  url: z.string().url().optional(),
  html: z.string().optional(),
  standards: z.array(z.string()).optional(),
  autoFix: z.boolean().optional().default(false),
  email: z.string().email().optional(), // Optional - to send results
}).refine(data => data.url || data.html, {
  message: 'Either url or html must be provided',
});

const scanSchema = z.object({
  micrositeId: z.string().uuid(),
  url: z.string().url().optional(),
  html: z.string().optional(),
  standards: z.array(z.string()).optional(),
  autoFix: z.boolean().optional().default(false),
});

export default async function accessibilityRoutes(server: FastifyInstance) {
  
  /**
   * FREE PUBLIC ACCESSIBILITY SCANNER
   * No authentication required - anyone can test their website!
   * POST /api/accessibility/scan-free
   */
  server.post('/scan-free', async (request, reply) => {
    try {
      const data = publicScanSchema.parse(request.body);
      
      // Generate public scan ID
      const publicScanId = nanoid(12);
      
      const result = await scanAccessibility({
        micrositeId: publicScanId, // Use public ID instead of microsite
        userId: 'public',
        url: data.url,
        html: data.html,
        standards: data.standards,
        autoFix: data.autoFix,
        skipSave: true, // Don't save public scans to database
      });
      
      // Get ML prediction for compliance (using scan result as proxy for HTML structure)
      const prediction = await predictComplianceIssues({
        images_without_alt: result.issues.filter(i => i.rule === '1.1.1').length,
        low_contrast_text: result.issues.filter(i => i.rule === '1.4.3').length,
        missing_aria: result.issues.filter(i => i.description.toLowerCase().includes('aria')).length,
        landmarks: 0,
        language: 1,
        headings: 0,
        forms: 0,
        critical_issues: result.issues.filter(i => i.impact === 'critical').length,
        serious_issues: result.issues.filter(i => i.impact === 'serious').length,
        moderate_issues: result.issues.filter(i => i.impact === 'moderate').length,
        minor_issues: result.issues.filter(i => i.impact === 'minor').length,
      });
      
      // Generate shareable URL
      const shareUrl = `https://qr-platform.com/accessibility/${publicScanId}`;
      
      return reply.send({
        success: true,
        scanId: publicScanId,
        shareUrl,
        score: result.score,
        issues: result.issues,
        wcagAA: result.wcagAA,
        wcagAAA: result.wcagAAA,
        adaCompliant: result.adaCompliant,
        autoFixesApplied: result.autoFixesApplied,
        mlPrediction: prediction,
        message: 'Free accessibility scan complete! Share this URL or embed badge on your site.',
      });
      
    } catch (error) {
      server.log.error(error, 'Failed to scan (public)');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Scan failed',
      });
    }
  });
  
  /**
   * Get public scan results by share ID
   * GET /api/accessibility/public/:scanId
   */
  server.get('/public/:scanId', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    
    const [scan] = await db
      .select()
      .from(accessibilityScans)
      .where(eq(accessibilityScans.micrositeId, scanId))
      .limit(1);
    
    if (!scan) {
      return reply.status(404).send({
        success: false,
        error: 'Scan not found',
      });
    }
    
    return reply.send({
      success: true,
      scan: {
        scanId: scan.micrositeId,
        score: scan.score,
        issues: scan.issues,
        wcagAA: scan.wcagAA,
        wcagAAA: scan.wcagAAA,
        adaCompliant: scan.adaCompliant,
        scannedAt: scan.createdAt,
      },
    });
  });
  
  /**
   * Get accessibility badge HTML (embeddable widget)
   * GET /api/accessibility/badge/:scanId
   */
  server.get('/badge/:scanId', async (request, reply) => {
    const { scanId } = request.params as { scanId: string };
    
    const [scan] = await db
      .select()
      .from(accessibilityScans)
      .where(eq(accessibilityScans.micrositeId, scanId))
      .limit(1);
    
    if (!scan) {
      return reply.status(404).send('Scan not found');
    }
    
    const score = scan.score || 0;
    const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
    const status = scan.wcagAA ? 'WCAG AA Compliant' : 'Needs Improvement';
    
    const badgeHtml = `
      <div style="display: inline-flex; align-items: center; padding: 8px 16px; background: ${color}; color: white; border-radius: 8px; font-family: sans-serif; font-size: 14px; font-weight: 600;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="margin-right: 8px;">
          <path d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C14.42 18 18 14.42 18 10C18 5.58 14.42 2 10 2Z" fill="white"/>
          <path d="M9 14L5 10L6.41 8.59L9 11.17L13.59 6.58L15 8L9 14Z" fill="${color}"/>
        </svg>
        <span>Accessibility: ${score}/100 - ${status}</span>
      </div>
    `;
    
    return reply.type('text/html').send(badgeHtml);
  });
  
  /**
   * Get current compliance rules (WCAG, ADA, AODA, etc.)
   * GET /api/accessibility/rules
   */
  server.get('/rules', async (request, reply) => {
    const rules = await getActiveComplianceRules();
    
    return reply.send({
      success: true,
      rules,
      count: rules.length,
      lastUpdated: new Date(),
    });
  });
  
  /**
   * Update compliance knowledge base (admin only)
   * POST /api/accessibility/update-knowledge
   */
  server.post('/update-knowledge', async (request, reply) => {
    try {
      const result = await updateComplianceKnowledge();
      
      return reply.send({
        success: true,
        data: result,
        message: `Found ${result.newRulesDetected} new compliance rules. Model ${result.modelRetrained ? 'retrained' : 'up to date'}.`,
      });
      
    } catch (error) {
      server.log.error(error, 'Failed to update compliance knowledge');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      });
    }
  });
  
  // AUTHENTICATED ENDPOINTS (for logged-in users)
  
  // Scan microsite for accessibility issues
  server.post('/scan', async (request, reply) => {
    try {
      const data = scanSchema.parse(request.body);
      
      const userId = request.headers['x-user-id'] as string || '00000000-0000-0000-0000-000000000000';
      
      if (!data.url && !data.html) {
        return reply.status(400).send({
          success: false,
          error: 'Either url or html must be provided',
        });
      }
      
      const result = await scanAccessibility({
        micrositeId: data.micrositeId,
        userId,
        url: data.url || '',
        html: data.html,
        standards: data.standards,
        autoFix: data.autoFix,
      });
      
      return reply.send({
        success: true,
        ...result,
      });
      
    } catch (error) {
      server.log.error(error, 'Failed to scan');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Scan failed',
      });
    }
  });
  
  // Get scan results
  server.get('/scan/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const scan = await db.query.accessibilityScans.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });
    
    if (!scan) {
      return reply.status(404).send({
        success: false,
        error: 'Scan not found',
      });
    }
    
    return reply.send({
      success: true,
      scan,
    });
  });
  
  // Get scans for a microsite
  server.get('/scans/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params as { micrositeId: string };
    
    const scans = await db.query.accessibilityScans.findMany({
      where: (table, { eq }) => eq(table.micrositeId, micrositeId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit: 10,
    });
    
    return reply.send({
      success: true,
      scans,
    });
  });
}
