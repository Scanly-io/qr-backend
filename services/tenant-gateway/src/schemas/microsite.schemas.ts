import { z } from 'zod';
import { schemas } from '../middleware/validation.js';

/**
 * Microsite Service Validation Schemas
 * Protects against injection in blocks (JSONB-heavy service)
 */

export const micrositeSchemas = {
  // Microsite creation
  createMicrosite: z.object({
    name: z.string().min(1).max(100),
    slug: schemas.slug.optional(),
    template: z.string().max(50).optional(),
    customDomain: z.string().max(255).regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
      'Invalid domain format'
    ).optional(),
  }).strict(),
  
  // Block creation/update (CRITICAL - blocks are stored as JSONB)
  block: z.object({
    type: z.string().max(50),
    order: z.number().int().min(0).max(1000),
    isVisible: z.boolean().default(true),
    
    // Block data (varies by type, but must be sanitized)
    data: z.object({
      // Common fields
      title: z.string().max(200).optional(),
      description: z.string().max(5000).optional(),
      
      // Links
      url: schemas.url.optional(),
      links: z.array(
        z.object({
          title: z.string().max(100),
          url: schemas.url,
          icon: z.string().max(50).optional(),
        }).strict()
      ).max(50).optional(),
      
      // Media
      imageUrl: schemas.url.optional(),
      videoUrl: schemas.url.optional(),
      
      // Social links
      social: z.record(
        z.enum(['twitter', 'linkedin', 'instagram', 'facebook', 'github', 'youtube', 'tiktok']),
        schemas.url
      ).optional(),
      
      // Contact info
      email: schemas.email.optional(),
      phone: z.string().max(20).optional(),
      
      // Custom fields (limited)
      customFields: z.record(z.string().max(50), z.any()).refine(
        (obj) => Object.keys(obj).length <= 20,
        'Too many custom fields (max 20)'
      ).optional(),
      
      // Styling
      style: z.object({
        backgroundColor: schemas.hexColor.optional(),
        textColor: schemas.hexColor.optional(),
        borderRadius: z.number().int().min(0).max(50).optional(),
        padding: z.number().int().min(0).max(100).optional(),
      }).strict().optional(),
    }).passthrough(), // Allow other fields but they'll be sanitized
    
    // Block settings
    settings: z.object({
      animation: z.string().max(50).optional(),
      clickable: z.boolean().default(true),
      trackClicks: z.boolean().default(true),
    }).strict().optional(),
  }).strict(),
  
  // Lead capture form submission (CRITICAL - user-submitted data)
  submitLead: z.object({
    micrositeId: schemas.uuid,
    blockId: schemas.uuid,
    data: z.object({
      name: z.string().min(1).max(100).refine(
        (val) => !/<script|javascript:/i.test(val),
        'Invalid characters'
      ).optional(),
      email: schemas.email.optional(),
      phone: z.string().max(20).optional(),
      company: z.string().max(100).optional(),
      message: z.string().max(5000).refine(
        (val) => !/<script|javascript:/i.test(val),
        'Invalid characters in message'
      ).optional(),
      customFields: z.record(
        z.string().max(50),
        z.string().max(500)
      ).refine(
        (obj) => Object.keys(obj).length <= 10,
        'Too many custom fields'
      ).optional(),
    }).strict(),
  }).strict(),
  
  // Analytics event tracking (can receive arbitrary metadata)
  trackEvent: z.object({
    micrositeId: schemas.uuid,
    eventType: z.enum([
      'page_view', 'block_click', 'link_click', 'form_submit',
      'video_play', 'share', 'download'
    ]),
    blockId: schemas.uuid.optional(),
    metadata: z.object({
      userAgent: z.string().max(500).optional(),
      ip: z.string().max(45).optional(),
      country: z.string().max(100).optional(),
      city: z.string().max(100).optional(),
      referrer: z.string().max(2048).optional(),
      customData: z.record(z.string(), z.any()).refine(
        (obj) => Object.keys(obj).length <= 20,
        'Too many metadata fields'
      ).optional(),
    }).strict().optional(),
  }).strict(),
};
