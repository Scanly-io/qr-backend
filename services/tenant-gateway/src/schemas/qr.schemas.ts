import { z } from 'zod';
import { schemas } from '../middleware/validation.js';

/**
 * QR Service Validation Schemas
 * Protects against injection in QR metadata and dynamic content
 */

export const qrSchemas = {
  // QR code creation
  createQR: z.object({
    name: z.string().min(1).max(100),
    type: z.enum([
      'url', 'vcard', 'wifi', 'email', 'sms', 'phone',
      'location', 'event', 'app', 'text', 'dynamic'
    ]),
    data: z.union([
      z.string().max(4096), // Simple URL or text
      z.object({}).passthrough(), // Complex data (will be validated by type)
    ]),
    folderId: schemas.uuid.optional(),
    tags: schemas.stringArray(50).optional(),
    metadata: schemas.metadata.optional(),
    settings: z.object({
      trackScans: z.boolean().default(true),
      password: z.string().max(128).optional(),
      expiresAt: z.string().datetime().optional(),
      maxScans: z.number().int().positive().max(1000000).optional(),
      customDomain: z.string().max(255).optional(),
    }).strict().optional(),
  }).strict(),
  
  // QR code update
  updateQR: z.object({
    name: z.string().min(1).max(100).optional(),
    data: z.union([
      z.string().max(4096),
      z.object({}).passthrough(),
    ]).optional(),
    tags: schemas.stringArray(50).optional(),
    metadata: schemas.metadata.optional(),
    settings: z.object({
      trackScans: z.boolean().optional(),
      password: z.string().max(128).optional(),
      expiresAt: z.string().datetime().optional(),
      maxScans: z.number().int().positive().max(1000000).optional(),
      customDomain: z.string().max(255).optional(),
    }).strict().optional(),
  }).strict(),
  
  // QR scan tracking (can receive arbitrary metadata from scanners)
  trackScan: z.object({
    qrId: schemas.uuid,
    metadata: z.object({
      userAgent: z.string().max(500).optional(),
      ip: z.string().max(45).optional(), // IPv6 max length
      country: z.string().max(100).optional(),
      city: z.string().max(100).optional(),
      device: z.string().max(100).optional(),
      browser: z.string().max(100).optional(),
      referrer: z.string().max(2048).optional(),
    }).strict().optional(),
  }).strict(),
  
  // Bulk QR creation (prevent DoS)
  bulkCreate: z.object({
    qrCodes: z.array(
      z.object({
        name: z.string().min(1).max(100),
        type: z.enum(['url', 'dynamic']),
        data: z.string().max(4096),
      }).strict()
    ).min(1).max(100), // Max 100 QR codes per request
    folderId: schemas.uuid.optional(),
  }).strict(),
};
