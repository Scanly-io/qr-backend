import { FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Input Validation Middleware
 * Protects against:
 * - JSONB injection attacks
 * - SQL injection via nested objects
 * - XSS attacks in JSON fields
 * - Data corruption from malformed inputs
 * - Script injection in metadata fields
 */

// Common validation schemas
export const schemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email format').max(255),
  
  // URL validation (for JSONB fields with URLs)
  url: z.string().url('Invalid URL format').max(2048),
  
  // Sanitized text (prevent XSS)
  safeText: z.string()
    .max(10000)
    .refine(
      (val) => !/<script|javascript:|onerror=|onclick=/i.test(val),
      'Potentially malicious content detected'
    ),
  
  // Hex color validation
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  
  // Slug validation (alphanumeric + hyphens)
  slug: z.string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  
  // Metadata/JSONB field validation
  metadata: z.record(z.string(), z.any())
    .refine(
      (obj) => {
        // Prevent deeply nested objects (DoS attack)
        const maxDepth = 5;
        const checkDepth = (o: any, depth = 0): boolean => {
          if (depth > maxDepth) return false;
          if (typeof o !== 'object' || o === null) return true;
          return Object.values(o).every(v => checkDepth(v, depth + 1));
        };
        return checkDepth(obj);
      },
      'Object nesting too deep'
    )
    .refine(
      (obj) => {
        // Prevent excessively large objects (DoS)
        const maxSize = 100; // max 100 keys
        const countKeys = (o: any): number => {
          if (typeof o !== 'object' || o === null) return 0;
          return Object.keys(o).length + 
            Object.values(o).reduce((sum, v) => sum + countKeys(v), 0);
        };
        return countKeys(obj) <= maxSize;
      },
      'Object too large'
    )
    .refine(
      (obj) => {
        // Prevent script injection in values
        const hasScript = (o: any): boolean => {
          if (typeof o === 'string') {
            return /<script|javascript:|onerror=|onclick=/i.test(o);
          }
          if (typeof o === 'object' && o !== null) {
            return Object.values(o).some(hasScript);
          }
          return false;
        };
        return !hasScript(obj);
      },
      'Potentially malicious content in metadata'
    ),
  
  // White-label configuration validation
  whiteLabel: z.object({
    logo: z.string().url().optional(),
    favicon: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    customDomain: z.string().max(255).optional(),
    emailFromName: z.string().max(100).optional(),
    emailFromAddress: z.string().email().optional(),
    supportEmail: z.string().email().optional(),
    customCss: z.string().max(50000).optional(), // Limited CSS size
    hidePoweredBy: z.boolean().optional(),
  }).strict(), // Reject unknown keys
  
  // Array validation with limits
  stringArray: (maxItems = 100) => z.array(z.string().max(255)).max(maxItems),
  
  // Pagination validation
  pagination: z.object({
    page: z.number().int().min(1).max(1000).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
  }),
};

/**
 * Validation error formatter
 */
function formatZodError(error: ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
}

/**
 * Request body validation middleware factory
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      request.body = await schema.parseAsync(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: formatZodError(error),
          statusCode: 400,
        });
      }
      throw error;
    }
  };
}

/**
 * Query params validation middleware factory
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = await schema.parseAsync(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: formatZodError(error),
          statusCode: 400,
        });
      }
      throw error;
    }
  };
}

/**
 * URL params validation middleware factory
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = await schema.parseAsync(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Invalid URL parameters',
          details: formatZodError(error),
          statusCode: 400,
        });
      }
      throw error;
    }
  };
}

/**
 * JSONB field sanitizer - Use before storing to database
 */
export function sanitizeJsonb(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Remove potential script injections
    return obj
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJsonb);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key (prevent __proto__ pollution)
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeJsonb(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate JSON size before parsing (prevent DoS)
 */
export function validateJsonSize(maxSizeKB = 500) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const contentLength = request.headers['content-length'];
    if (contentLength) {
      const sizeKB = parseInt(contentLength) / 1024;
      if (sizeKB > maxSizeKB) {
        return reply.status(413).send({
          error: 'Request body too large',
          maxSizeKB,
          receivedSizeKB: Math.round(sizeKB),
          statusCode: 413,
        });
      }
    }
  };
}
