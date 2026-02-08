import OpenAI from 'openai';
import pino from 'pino';
import { db } from '../db.js';
import { aiGenerations } from '../schema.js';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics.js';
import { extractBrandAesthetic } from './brand-analyzer.js';
import { eq } from 'drizzle-orm';

const logger = pino({ name: 'ml-service:ai-generator' });

// Make OpenAI optional
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  logger.warn('OPENAI_API_KEY not set - AI generation features will be disabled');
}

interface GenerateMicrositeOptions {
  userId: string;
  prompt?: string;
  brandUrl?: string;
  brandName?: string;
  industry?: string;
  mobileFirst?: boolean;
}

interface GeneratedMicrosite {
  generationId: string;
  html: string;
  css: string;
  js: string;
  components: Array<{
    type: string;
    props: Record<string, any>;
    order: number;
  }>;
  brandAesthetic: any;
}

/**
 * AI Microsite Generator
 * 
 * Two modes:
 * 1. Brand Analysis Mode: Scrape social media/website, extract aesthetic, generate matching site
 * 2. Prompt Mode: Single prompt → complete microsite
 */
export async function generateMicrosite(options: GenerateMicrositeOptions): Promise<GeneratedMicrosite> {
  const startTime = Date.now();
  
  try {
    // Create generation record
    const [generation] = await db.insert(aiGenerations).values({
      userId: options.userId,
      prompt: options.prompt,
      brandUrl: options.brandUrl,
      brandName: options.brandName,
      industry: options.industry,
      mobileFirst: options.mobileFirst ?? true,
      status: 'generating',
    } as any).returning();

    logger.info({ generationId: generation.id }, 'Starting AI microsite generation');

    // Publish start event
    await publishEvent(TOPICS.AI_GENERATION_STARTED, {
      id: generation.id,
      userId: options.userId,
      timestamp: new Date().toISOString(),
    });

    // Step 1: Analyze brand aesthetic (if URL provided)
    let brandAesthetic: any = null;
    if (options.brandUrl) {
      logger.info('Analyzing brand aesthetic from URL');
      brandAesthetic = await extractBrandAesthetic({
        url: options.brandUrl,
        brandName: options.brandName,
      });
    }

    // Step 2: Build AI prompt
    const systemPrompt = buildSystemPrompt(options.mobileFirst ?? true);
    const userPrompt = buildUserPrompt({
      prompt: options.prompt,
      brandAesthetic,
      brandName: options.brandName,
      industry: options.industry,
    });

    // Step 3: Generate microsite with GPT-4
    if (!openai) {
      throw new Error('OpenAI API key not configured. AI generation is disabled.');
    }
    logger.info('Generating microsite with GPT-4');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    // Step 4: Extract components from generated design
    const components = extractComponents(result.html);

    // Step 5: Update generation record
    const generationTime = Date.now() - startTime;
    await db.update(aiGenerations)
      .set({
        brandAesthetic,
        generatedHtml: result.html,
        generatedCss: result.css,
        generatedJs: result.js || '',
        components,
        layout: result.layout || 'single-page',
        status: 'completed',
        generationTime,
        modelUsed: 'gpt-4o',
        updatedAt: new Date(),
      } as any)
      .where(eq(aiGenerations.id, generation.id));

    logger.info({ generationId: generation.id, generationTime }, 'Microsite generation completed');

    // Publish completion event
    await publishEvent(TOPICS.AI_GENERATION_COMPLETED, {
      id: generation.id,
      userId: options.userId,
      generationTime,
      timestamp: new Date().toISOString(),
    });

    return {
      generationId: generation.id,
      html: result.html,
      css: result.css,
      js: result.js || '',
      components,
      brandAesthetic,
    };

  } catch (error) {
    logger.error(error, 'Failed to generate microsite');
    
    // Publish failure event
    await publishEvent(TOPICS.AI_GENERATION_FAILED, {
      userId: options.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

function buildSystemPrompt(mobileFirst: boolean): string {
  return `You are an expert web designer and developer specializing in ${mobileFirst ? 'mobile-first' : 'desktop-first'} responsive design.

Your task is to generate complete, production-ready microsite code (HTML, CSS, JavaScript) based on user requirements.

CRITICAL REQUIREMENTS:
1. ${mobileFirst ? 'Design for MOBILE FIRST (320px-414px), then scale to desktop' : 'Design for desktop, then scale to mobile'}
2. Use semantic HTML5
3. Include meta tags for SEO and social sharing
4. Ensure WCAG 2.1 AA accessibility (alt text, ARIA labels, keyboard navigation)
5. Use modern CSS (Grid, Flexbox, custom properties)
6. Include smooth animations and micro-interactions
7. Optimize for performance (lazy loading, efficient CSS)
8. Responsive images with srcset
9. Touch-friendly buttons (min 44x44px)
10. Fast load time (<2s on 3G)

DESIGN PRINCIPLES:
- Use consistent spacing (8px grid system)
- Hierarchy through typography (clamp() for fluid type)
- High contrast ratios (4.5:1 minimum)
- Clear call-to-action buttons
- Engaging visual elements
- Professional and modern aesthetic

OUTPUT FORMAT:
Return a JSON object with these keys:
{
  "html": "complete HTML document",
  "css": "complete CSS styles",
  "js": "optional JavaScript for interactions",
  "layout": "single-page | multi-section | story",
  "description": "brief description of the design"
}`;
}

function buildUserPrompt(options: {
  prompt?: string;
  brandAesthetic?: any;
  brandName?: string;
  industry?: string;
}): string {
  let prompt = '';

  if (options.prompt) {
    prompt += `User Request: ${options.prompt}\n\n`;
  }

  if (options.brandAesthetic) {
    prompt += `Brand Aesthetic Analysis:\n`;
    prompt += `- Brand: ${options.brandName}\n`;
    prompt += `- Primary Color: ${options.brandAesthetic.colors.primary}\n`;
    prompt += `- Secondary Color: ${options.brandAesthetic.colors.secondary}\n`;
    prompt += `- Color Palette: ${options.brandAesthetic.colors.palette.join(', ')}\n`;
    prompt += `- Heading Font: ${options.brandAesthetic.fonts.heading}\n`;
    prompt += `- Body Font: ${options.brandAesthetic.fonts.body}\n`;
    prompt += `- Visual Style: ${options.brandAesthetic.visualStyle}\n`;
    prompt += `- Mood: ${options.brandAesthetic.mood.join(', ')}\n`;
    prompt += `- Target Audience: ${options.brandAesthetic.targetAudience}\n\n`;
    prompt += `Match this brand aesthetic in your design.\n\n`;
  }

  if (options.industry) {
    prompt += `Industry: ${options.industry}\n`;
    prompt += `Incorporate industry-appropriate imagery and messaging.\n\n`;
  }

  if (!options.prompt && !options.brandAesthetic) {
    prompt += 'Generate a modern, professional landing page with a hero section, features, and call-to-action.\n';
  }

  return prompt;
}

function extractComponents(html: string): Array<{ type: string; props: Record<string, any>; order: number }> {
  // Parse HTML and identify common component patterns
  const components: Array<{ type: string; props: Record<string, any>; order: number }> = [];
  let order = 0;

  // Detect hero section
  if (html.includes('hero') || html.match(/<header[^>]*>/i)) {
    components.push({
      type: 'hero',
      props: { fullscreen: true },
      order: order++,
    });
  }

  // Detect feature sections
  const featureMatches = html.match(/<section[^>]*class="[^"]*features?[^"]*"/gi);
  if (featureMatches) {
    components.push({
      type: 'features',
      props: { count: featureMatches.length },
      order: order++,
    });
  }

  // Detect CTA sections
  if (html.match(/cta|call-to-action/i)) {
    components.push({
      type: 'cta',
      props: {},
      order: order++,
    });
  }

  // Detect gallery
  if (html.match(/gallery|grid.*images?/i)) {
    components.push({
      type: 'gallery',
      props: {},
      order: order++,
    });
  }

  // Detect testimonials
  if (html.match(/testimonial|review/i)) {
    components.push({
      type: 'testimonials',
      props: {},
      order: order++,
    });
  }

  // Detect contact form
  if (html.match(/<form/i)) {
    components.push({
      type: 'contact-form',
      props: {},
      order: order++,
    });
  }

  return components;
}

/**
 * Regenerate specific section of microsite
 */
export async function regenerateSection(generationId: string, sectionType: string, instructions: string) {
  // Load existing generation
  const generation = await db.query.aiGenerations.findFirst({
    where: (table, { eq }) => eq(table.id, generationId),
  });

  if (!generation) {
    throw new Error('Generation not found');
  }

  if (!openai) {
    throw new Error('OpenAI API key not configured. AI regeneration is disabled.');
  }

  // Use GPT-4 to regenerate just this section
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a web designer. Regenerate a specific section of a website based on user feedback.',
      },
      {
        role: 'user',
        content: `Current ${sectionType} section:\n${extractSection(generation.generatedHtml!, sectionType)}\n\nUser feedback: ${instructions}\n\nGenerate improved HTML and CSS for this section only.`,
      },
    ],
    temperature: 0.8,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

function extractSection(html: string, sectionType: string): string {
  // Simple section extraction (can be improved with proper HTML parsing)
  const regex = new RegExp(`<section[^>]*class="[^"]*${sectionType}[^"]*"[^>]*>.*?</section>`, 'is');
  const match = html.match(regex);
  return match ? match[0] : '';
}
