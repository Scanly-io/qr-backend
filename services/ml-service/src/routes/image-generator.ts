import { FastifyInstance } from 'fastify';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function imageGeneratorRoutes(fastify: FastifyInstance) {
  // Generate background image
  fastify.post('/generate-background', async (request, reply) => {
    const { theme, style, colors, description } = request.body as {
      theme?: string; // e.g., "professional", "creative", "minimal", "vibrant"
      style?: string; // e.g., "gradient", "abstract", "geometric", "nature"
      colors?: string[]; // e.g., ["blue", "purple"]
      description?: string; // custom description
    };

    let prompt = description || '';

    if (!prompt) {
      const themeText = theme || 'professional';
      const styleText = style || 'abstract';
      const colorText = colors && colors.length > 0 ? ` with ${colors.join(' and ')} colors` : '';

      prompt = `Create a ${themeText} ${styleText} background image${colorText} suitable for a website hero section. Modern, clean, high quality. No text, no people, just beautiful design.`;
    }

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024', // Wide format for backgrounds
        quality: 'standard',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;

      if (!imageUrl) {
        return reply.status(500).send({ error: 'Failed to generate image' });
      }

      return {
        imageUrl,
        prompt,
        size: '1792x1024',
        model: 'dall-e-3',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate background image', message: error.message });
    }
  });

  // Generate profile/avatar image
  fastify.post('/generate-avatar', async (request, reply) => {
    const { style, description } = request.body as {
      style?: 'abstract' | 'geometric' | 'minimal' | 'artistic';
      description?: string;
    };

    let prompt = description || '';

    if (!prompt) {
      const styleText = style || 'abstract';
      prompt = `Create a ${styleText} avatar or profile image. Modern, professional, visually striking. Suitable for a personal brand. No text, no realistic faces.`;
    }

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024', // Square for avatars
        quality: 'standard',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;

      if (!imageUrl) {
        return reply.status(500).send({ error: 'Failed to generate avatar' });
      }

      return {
        imageUrl,
        prompt,
        size: '1024x1024',
        model: 'dall-e-3',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate avatar', message: error.message });
    }
  });

  // Generate icon/logo
  fastify.post('/generate-icon', async (request, reply) => {
    const { concept, style, colors } = request.body as {
      concept: string; // e.g., "coffee", "tech", "fitness"
      style?: 'minimal' | 'modern' | 'flat' | 'gradient';
      colors?: string[];
    };

    const styleText = style || 'minimal';
    const colorText = colors && colors.length > 0 ? ` using ${colors.join(' and ')} colors` : '';

    const prompt = `Create a ${styleText} icon or logo representing ${concept}${colorText}. Simple, clean, professional design. Centered on white background. No text.`;

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;

      if (!imageUrl) {
        return reply.status(500).send({ error: 'Failed to generate icon' });
      }

      return {
        imageUrl,
        prompt,
        size: '1024x1024',
        model: 'dall-e-3',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate icon', message: error.message });
    }
  });

  // Generate social media image
  fastify.post('/generate-social', async (request, reply) => {
    const { platform, topic, style } = request.body as {
      platform?: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
      topic: string;
      style?: string;
    };

    const styleText = style || 'professional';
    const platformText = platform ? ` optimized for ${platform}` : '';

    const prompt = `Create a ${styleText} social media image about ${topic}${platformText}. Eye-catching, modern design. No text overlays.`;

    // Platform-specific sizes
    const sizeMap = {
      instagram: '1024x1024', // Square
      twitter: '1792x1024', // Wide
      linkedin: '1792x1024', // Wide
      facebook: '1792x1024', // Wide
    };

    const size = (platform && sizeMap[platform]) || '1024x1024';

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: size as '1024x1024' | '1792x1024' | '1024x1792',
        quality: 'standard',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;

      if (!imageUrl) {
        return reply.status(500).send({ error: 'Failed to generate social image' });
      }

      return {
        imageUrl,
        prompt,
        size,
        platform: platform || 'general',
        model: 'dall-e-3',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate social media image', message: error.message });
    }
  });

  // Generate pattern/texture
  fastify.post('/generate-pattern', async (request, reply) => {
    const { type, colors, complexity } = request.body as {
      type?: 'geometric' | 'organic' | 'abstract' | 'minimal';
      colors?: string[];
      complexity?: 'simple' | 'medium' | 'complex';
    };

    const typeText = type || 'geometric';
    const complexityText = complexity || 'medium';
    const colorText = colors && colors.length > 0 ? ` using ${colors.join(', ')} colors` : '';

    const prompt = `Create a seamless ${complexityText} ${typeText} pattern${colorText}. Tileable, modern design suitable for backgrounds. High quality, professional.`;

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;

      if (!imageUrl) {
        return reply.status(500).send({ error: 'Failed to generate pattern' });
      }

      return {
        imageUrl,
        prompt,
        size: '1024x1024',
        seamless: true,
        model: 'dall-e-3',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate pattern', message: error.message });
    }
  });

  // Edit/variation of existing image
  fastify.post('/create-variation', async (request, reply) => {
    const { imageUrl, modifications } = request.body as {
      imageUrl: string;
      modifications?: string;
    };

    // Note: DALL-E 3 doesn't support variations directly
    // We'll regenerate with a similar prompt instead
    const prompt = modifications
      ? `Create a variation of an image with these modifications: ${modifications}. Maintain similar style and composition.`
      : 'Create a variation of the existing image with subtle changes while maintaining the overall theme.';

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
      });

      const newImageUrl = response.data[0]?.url;

      if (!newImageUrl) {
        return reply.status(500).send({ error: 'Failed to create variation' });
      }

      return {
        imageUrl: newImageUrl,
        originalUrl: imageUrl,
        prompt,
        model: 'dall-e-3',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create image variation', message: error.message });
    }
  });

  // Suggest image prompts based on microsite content
  fastify.post('/suggest-prompts', async (request, reply) => {
    const { title, description, industry, style } = request.body as {
      title: string;
      description?: string;
      industry?: string;
      style?: string;
    };

    const context = `
Title: ${title}
${description ? `Description: ${description}` : ''}
${industry ? `Industry: ${industry}` : ''}
${style ? `Preferred Style: ${style}` : ''}
`;

    const prompt = `Based on this microsite content, suggest 5 creative image prompts for backgrounds or hero images. Each should be detailed and specific.\n\n${context}\n\nReturn only the prompts, one per line.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a creative director helping generate detailed DALL-E image prompts. Make them specific, visually descriptive, and suitable for modern web design.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 300,
      });

      const promptsText = completion.choices[0]?.message?.content || '';
      const prompts = promptsText
        .split('\n')
        .map((p) => p.replace(/^\d+\.\s*/, '').trim())
        .filter((p) => p.length > 0);

      return {
        prompts,
        count: prompts.length,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate prompt suggestions', message: error.message });
    }
  });
}
