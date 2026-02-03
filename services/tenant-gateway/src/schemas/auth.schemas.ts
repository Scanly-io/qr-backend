import { z } from 'zod';
import { schemas } from '../middleware/validation.js';

/**
 * Auth Service Validation Schemas
 * Protects against injection attacks in authentication flows
 */

export const authSchemas = {
  // User signup
  signup: z.object({
    email: schemas.email,
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number'),
    name: z.string()
      .min(1, 'Name required')
      .max(100, 'Name too long')
      .refine(
        (val) => !/<script|javascript:|onerror=/i.test(val),
        'Invalid characters in name'
      ),
    organizationName: z.string().max(100).optional(),
  }).strict(),
  
  // User login
  login: z.object({
    email: schemas.email,
    password: z.string().min(1, 'Password required').max(128),
  }).strict(),
  
  // Password reset request
  passwordResetRequest: z.object({
    email: schemas.email,
  }).strict(),
  
  // Password reset confirm
  passwordResetConfirm: z.object({
    token: z.string().min(1, 'Token required'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number'),
  }).strict(),
  
  // Agency creation
  createAgency: z.object({
    name: z.string().min(3).max(100),
    slug: schemas.slug,
    website: schemas.url.optional(),
    plan: z.enum(['starter', 'professional', 'enterprise']).default('starter'),
  }).strict(),
  
  // Agency white-label update (CRITICAL - JSONB field)
  updateWhiteLabel: z.object({
    logo: schemas.url.optional(),
    favicon: schemas.url.optional(),
    primaryColor: schemas.hexColor.optional(),
    secondaryColor: schemas.hexColor.optional(),
    customDomain: z.string().max(255).regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
      'Invalid domain format'
    ).optional(),
    emailFromName: z.string().max(100).refine(
      (val) => !/<script|javascript:/i.test(val),
      'Invalid email from name'
    ).optional(),
    emailFromAddress: schemas.email.optional(),
    supportEmail: schemas.email.optional(),
    customCss: z.string()
      .max(50000, 'CSS too large (max 50KB)')
      .refine(
        (val) => !/<script|javascript:|onerror=/i.test(val),
        'Potentially malicious CSS detected'
      )
      .optional(),
    hidePoweredBy: z.boolean().optional(),
  }).strict(),
  
  // Agency member invite
  inviteMember: z.object({
    email: schemas.email,
    role: z.enum(['admin', 'member', 'viewer']),
    permissions: z.object({
      createMicrosites: z.boolean().default(true),
      editMicrosites: z.boolean().default(true),
      deleteMicrosites: z.boolean().default(false),
      manageBilling: z.boolean().default(false),
      manageTeam: z.boolean().default(false),
      viewAnalytics: z.boolean().default(true),
    }).strict().optional(),
  }).strict(),
};
