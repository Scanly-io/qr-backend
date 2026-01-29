import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import OpenAI from 'openai';
import pino from 'pino';
import sharp from 'sharp';

const logger = pino({ name: 'ml-service:brand-analyzer' });

// Make OpenAI optional - only initialize if API key is provided
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  logger.warn('OPENAI_API_KEY not set - AI features will be disabled');
}

interface BrandAesthetic {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    palette: string[];
  };
  fonts: {
    heading: string;
    body: string;
    accent?: string;
  };
  mood: string[];
  visualStyle: string;
  targetAudience: string;
}

/**
 * Extract brand aesthetic from website or social media URL
 * 
 * Supports:
 * - Company websites
 * - Instagram profiles
 * - LinkedIn company pages
 * - Twitter/X profiles
 * - Facebook pages
 */
export async function extractBrandAesthetic(options: {
  url: string;
  brandName?: string;
}): Promise<BrandAesthetic> {
  logger.info({ url: options.url }, 'Extracting brand aesthetic');

  try {
    // Determine source type
    const urlLower = options.url.toLowerCase();
    
    if (urlLower.includes('instagram.com')) {
      return await analyzeInstagram(options.url, options.brandName);
    } else if (urlLower.includes('linkedin.com')) {
      return await analyzeLinkedIn(options.url, options.brandName);
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return await analyzeTwitter(options.url, options.brandName);
    } else {
      return await analyzeWebsite(options.url, options.brandName);
    }
  } catch (error) {
    logger.error(error, 'Failed to extract brand aesthetic');
    
    // Return default aesthetic if analysis fails
    return {
      colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        accent: '#f59e0b',
        palette: ['#2563eb', '#7c3aed', '#f59e0b', '#10b981', '#ef4444'],
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter',
      },
      mood: ['modern', 'professional'],
      visualStyle: 'minimalist',
      targetAudience: 'general',
    };
  }
}

/**
 * Analyze website using Playwright (full page rendering)
 */
async function analyzeWebsite(url: string, brandName?: string): Promise<BrandAesthetic> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    
    // Take screenshot
    const screenshot = await page.screenshot({ fullPage: false });
    
    // Extract colors from screenshot
    const colors = await extractColorsFromImage(screenshot);
    
    // Extract text content
    const textContent = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent || '';
      const h2 = document.querySelectorAll('h2');
      const paragraphs = document.querySelectorAll('p');
      
      return {
        headline: h1,
        subheadings: Array.from(h2).map(el => el.textContent).filter(Boolean),
        paragraphs: Array.from(paragraphs).slice(0, 3).map(el => el.textContent).filter(Boolean),
      };
    });
    
    // Extract computed fonts
    const fonts = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const p = document.querySelector('p');
      
      return {
        heading: h1 ? window.getComputedStyle(h1).fontFamily : '',
        body: p ? window.getComputedStyle(p).fontFamily : '',
      };
    });
    
    await browser.close();
    
    // Use GPT-4 Vision to analyze aesthetic
    const aesthetic = await analyzeWithGPT4Vision(screenshot, {
      brandName,
      textContent,
      extractedColors: colors,
      extractedFonts: fonts,
    });
    
    return aesthetic;

  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Analyze Instagram profile
 */
async function analyzeInstagram(url: string, brandName?: string): Promise<BrandAesthetic> {
  // Instagram requires authentication, so we'll use a simpler approach
  // In production, you'd want to use Instagram Graph API
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for images to load
    
    const screenshot = await page.screenshot({ fullPage: false });
    await browser.close();
    
    const colors = await extractColorsFromImage(screenshot);
    
    // Analyze with GPT-4 Vision
    const aesthetic = await analyzeWithGPT4Vision(screenshot, {
      brandName,
      platform: 'Instagram',
      extractedColors: colors,
    });
    
    return aesthetic;

  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Analyze LinkedIn company page
 */
async function analyzeLinkedIn(url: string, brandName?: string): Promise<BrandAesthetic> {
  return analyzeWebsite(url, brandName); // Similar approach to website
}

/**
 * Analyze Twitter/X profile
 */
async function analyzeTwitter(url: string, brandName?: string): Promise<BrandAesthetic> {
  return analyzeWebsite(url, brandName); // Similar approach to website
}

/**
 * Extract colors from image using sharp
 */
async function extractColorsFromImage(imageBuffer: Buffer): Promise<string[]> {
  try {
    // Get dominant colors using sharp stats
    const { dominant } = await sharp(imageBuffer).stats();
    
    // Convert RGB to hex
    const primaryColor = `#${dominant.r.toString(16).padStart(2, '0')}${dominant.g.toString(16).padStart(2, '0')}${dominant.b.toString(16).padStart(2, '0')}`;
    
    // Generate complementary palette (simple approach)
    const palette = [
      primaryColor,
      adjustColor(primaryColor, 30),  // Lighter
      adjustColor(primaryColor, -30), // Darker
      '#f59e0b', // Accent orange
      '#10b981', // Accent green
    ];
    
    return palette;
  } catch (error) {
    logger.error(error, 'Failed to extract colors');
    return ['#2563eb', '#7c3aed', '#f59e0b', '#10b981', '#ef4444'];
  }
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Use GPT-4 Vision to analyze brand aesthetic from screenshot
 */
async function analyzeWithGPT4Vision(
  screenshot: Buffer,
  context: {
    brandName?: string;
    platform?: string;
    textContent?: any;
    extractedColors?: string[];
    extractedFonts?: { heading: string; body: string };
  }
): Promise<BrandAesthetic> {
  const base64Image = screenshot.toString('base64');
  
  const prompt = `Analyze this ${context.platform || 'website'} screenshot${context.brandName ? ` for the brand "${context.brandName}"` : ''}.

Extract and describe:
1. **Primary Color**: The dominant brand color (hex code)
2. **Secondary Color**: Supporting color (hex code)
3. **Accent Color**: Call-to-action or highlight color (hex code)
4. **Color Palette**: List of 5-6 colors used (hex codes)
5. **Heading Font**: Font family for headings (e.g., "Inter", "Playfair Display")
6. **Body Font**: Font family for body text
7. **Mood**: 2-3 adjectives describing the aesthetic (e.g., "modern", "playful", "luxury")
8. **Visual Style**: Overall design style (e.g., "minimalist", "maximalist", "vintage", "brutalist")
9. **Target Audience**: Who this design appeals to

${context.extractedColors ? `Detected colors: ${context.extractedColors.join(', ')}` : ''}
${context.extractedFonts ? `Detected fonts: Heading="${context.extractedFonts.heading}", Body="${context.extractedFonts.body}"` : ''}

Return ONLY a JSON object with this structure:
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"]
  },
  "fonts": {
    "heading": "Font Name",
    "body": "Font Name"
  },
  "mood": ["adjective1", "adjective2"],
  "visualStyle": "style description",
  "targetAudience": "audience description"
}`;

  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured. AI features are disabled.');
    }
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || '{}';
    
    // Extract JSON from response (GPT-4 Vision sometimes adds explanation)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const aesthetic: BrandAesthetic = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    
    logger.info({ aesthetic }, 'Brand aesthetic analyzed');
    
    return aesthetic;

  } catch (error) {
    logger.error(error, 'Failed to analyze with GPT-4 Vision');
    
    // Fallback to extracted colors/fonts if available
    return {
      colors: {
        primary: context.extractedColors?.[0] || '#2563eb',
        secondary: context.extractedColors?.[1] || '#7c3aed',
        accent: context.extractedColors?.[2] || '#f59e0b',
        palette: context.extractedColors || ['#2563eb', '#7c3aed', '#f59e0b'],
      },
      fonts: {
        heading: cleanFontName(context.extractedFonts?.heading) || 'Inter',
        body: cleanFontName(context.extractedFonts?.body) || 'Inter',
      },
      mood: ['modern', 'professional'],
      visualStyle: 'minimalist',
      targetAudience: 'general',
    };
  }
}

function cleanFontName(fontFamily?: string): string {
  if (!fontFamily) return 'Inter';
  
  // Extract first font from font stack
  const firstFont = fontFamily.split(',')[0].trim();
  
  // Remove quotes
  return firstFont.replace(/['"]/g, '');
}
