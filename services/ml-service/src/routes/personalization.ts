import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getPersonalizedCTA,
  trackCTAClick,
  createPersonalizedCTA,
} from '../lib/personalization.js';
import { db } from '../db.js';

const getCtaSchema = z.object({
  ctaId: z.string().uuid(),
  visitorId: z.string().optional(),
  sessionId: z.string().optional(),
});

const createCtaSchema = z.object({
  micrositeId: z.string().uuid(),
  name: z.string(),
  defaultText: z.string(),
  defaultUrl: z.string().url(),
  rules: z.array(z.any()).optional(),
  abTestEnabled: z.boolean().optional(),
  abVariants: z.array(z.any()).optional(),
});

const trackClickSchema = z.object({
  impressionId: z.string(),
  ctaId: z.string().uuid(),
  micrositeId: z.string().uuid(),
});

export default async function personalizationRoutes(server: FastifyInstance) {
  
  // Get personalized CTA for visitor
  server.post('/cta', async (request, reply) => {
    try {
      const { ctaId, visitorId, sessionId } = getCtaSchema.parse(request.body);
      
      const context: any = {
        visitorId,
        sessionId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        referrer: request.headers.referer || request.headers.referrer,
        // Parse UTM params from query string
        utmParams: {
          source: (request.query as any).utm_source,
          medium: (request.query as any).utm_medium,
          campaign: (request.query as any).utm_campaign,
        },
      };
      
      const cta = await getPersonalizedCTA(ctaId, context);
      
      return reply.send({
        success: true,
        cta,
      });
      
    } catch (error) {
      server.log.error(error, 'Failed to get personalized CTA');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get CTA',
      });
    }
  });
  
  // Track CTA click
  server.post('/cta/click', async (request, reply) => {
    try {
      const { impressionId, ctaId, micrositeId } = trackClickSchema.parse(request.body);
      
      await trackCTAClick(impressionId, ctaId, micrositeId);
      
      return reply.send({
        success: true,
        message: 'Click tracked',
      });
      
    } catch (error) {
      server.log.error(error, 'Failed to track click');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track click',
      });
    }
  });
  
  // Create personalized CTA
  server.post('/cta/create', async (request, reply) => {
    try {
      const data = createCtaSchema.parse(request.body);
      
      const userId = request.headers['x-user-id'] as string || '00000000-0000-0000-0000-000000000000';
      
      const cta = await createPersonalizedCTA({
        ...data,
        userId,
      } as any);
      
      return reply.send({
        success: true,
        cta,
      });
      
    } catch (error) {
      server.log.error(error, 'Failed to create CTA');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create CTA',
      });
    }
  });
  
  // Get CTA analytics
  server.get('/cta/:id/analytics', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const cta = await db.query.personalizedCtas.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });
    
    if (!cta) {
      return reply.status(404).send({ error: 'CTA not found' });
    }
    
    // Get interaction stats
    const interactions = await db.query.ctaInteractions.findMany({
      where: (table, { eq }) => eq(table.ctaId, id),
      limit: 1000,
    });
    
    const impressions = interactions.filter(i => i.eventType === 'impression').length;
    const clicks = interactions.filter(i => i.eventType === 'click').length;
    const conversionRate = impressions > 0 ? (clicks / impressions) * 100 : 0;
    
    return reply.send({
      cta,
      analytics: {
        impressions,
        clicks,
        conversionRate: conversionRate.toFixed(2) + '%',
        interactions: interactions.slice(0, 100), // Last 100 interactions
      },
    });
  });
}
