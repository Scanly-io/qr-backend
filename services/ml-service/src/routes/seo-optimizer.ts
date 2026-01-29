import { FastifyInstance } from 'fastify';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function seoOptimizerRoutes(fastify: FastifyInstance) {
  // Generate meta description
  fastify.post('/generate-meta-description', async (request, reply) => {
    const { title, content, keywords, maxLength } = request.body as {
      title: string;
      content?: string;
      keywords?: string[];
      maxLength?: number;
    };

    const charLimit = maxLength || 155;
    const keywordsText = keywords?.length ? ` Focus on these keywords: ${keywords.join(', ')}.` : '';
    const contentText = content ? ` Page content: ${content.substring(0, 200)}` : '';

    const prompt = `Write an SEO-optimized meta description for a page titled "${title}".${contentText}${keywordsText} Keep it under ${charLimit} characters. Make it compelling to encourage clicks from search results.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert specializing in creating compelling, keyword-rich meta descriptions that improve click-through rates from search engines.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      const description = completion.choices[0]?.message?.content?.trim() || '';

      return {
        description,
        length: description.length,
        optimal: description.length >= 120 && description.length <= 155,
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate meta description', message: error.message });
    }
  });

  // Generate page title (SEO optimized)
  fastify.post('/generate-title', async (request, reply) => {
    const { topic, keywords, brandName, maxLength } = request.body as {
      topic: string;
      keywords?: string[];
      brandName?: string;
      maxLength?: number;
    };

    const charLimit = maxLength || 60;
    const keywordsText = keywords?.length ? ` Include keywords: ${keywords.join(', ')}.` : '';
    const brandText = brandName ? ` Include brand: "${brandName}".` : '';

    const prompt = `Create an SEO-optimized page title for: "${topic}".${keywordsText}${brandText} Keep it under ${charLimit} characters. Make it compelling and keyword-rich for search engines.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert creating search-engine-optimized page titles that rank well and drive clicks.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 50,
      });

      const title = completion.choices[0]?.message?.content?.trim().replace(/['"]/g, '') || '';

      return {
        title,
        length: title.length,
        optimal: title.length >= 30 && title.length <= 60,
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate title', message: error.message });
    }
  });

  // Extract and suggest keywords
  fastify.post('/extract-keywords', async (request, reply) => {
    const { content, count } = request.body as {
      content: string;
      count?: number;
    };

    const numKeywords = Math.min(count || 10, 20);

    const prompt = `Analyze this content and extract the ${numKeywords} most important SEO keywords and phrases. Consider search intent and relevance.\n\nContent: "${content.substring(0, 1000)}"\n\nReturn only the keywords, one per line, ordered by importance.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO keyword research expert. Extract valuable keywords that would help content rank in search engines.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });

      const keywordsText = completion.choices[0]?.message?.content || '';
      const keywords = keywordsText
        .split('\n')
        .map((k) => k.replace(/^\d+\.\s*/, '').replace(/[-•]/g, '').trim())
        .filter((k) => k.length > 0);

      return {
        keywords,
        count: keywords.length,
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to extract keywords', message: error.message });
    }
  });

  // Generate Open Graph tags
  fastify.post('/generate-og-tags', async (request, reply) => {
    const { title, description, type, url } = request.body as {
      title: string;
      description?: string;
      type?: 'website' | 'article' | 'profile' | 'product';
      url?: string;
    };

    const ogType = type || 'website';

    // If no description provided, generate one
    let ogDescription = description;
    if (!ogDescription) {
      const descPrompt = `Write a compelling 100-character description for social media sharing for a page titled "${title}".`;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a social media expert creating compelling descriptions for link previews.',
            },
            { role: 'user', content: descPrompt },
          ],
          temperature: 0.7,
          max_tokens: 80,
        });

        ogDescription = completion.choices[0]?.message?.content?.trim() || title;
      } catch (error: any) {
        fastify.log.error(error);
        ogDescription = title;
      }
    }

    const tags = {
      'og:title': title,
      'og:description': ogDescription,
      'og:type': ogType,
      ...(url ? { 'og:url': url } : {}),
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': ogDescription,
    };

    return {
      tags,
      html: Object.entries(tags)
        .map(([key, value]) => {
          if (key.startsWith('og:')) {
            return `<meta property="${key}" content="${value}" />`;
          }
          return `<meta name="${key}" content="${value}" />`;
        })
        .join('\n'),
    };
  });

  // SEO audit and suggestions
  fastify.post('/audit', async (request, reply) => {
    const { title, description, content, keywords } = request.body as {
      title?: string;
      description?: string;
      content?: string;
      keywords?: string[];
    };

    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Title checks
    if (!title || title.length === 0) {
      issues.push('Missing page title');
      suggestions.push('Add a descriptive, keyword-rich title (30-60 characters)');
      score -= 20;
    } else if (title.length < 30) {
      issues.push('Title too short');
      suggestions.push('Expand title to 30-60 characters for better SEO');
      score -= 10;
    } else if (title.length > 60) {
      issues.push('Title too long');
      suggestions.push('Shorten title to under 60 characters to avoid truncation in search results');
      score -= 10;
    }

    // Description checks
    if (!description || description.length === 0) {
      issues.push('Missing meta description');
      suggestions.push('Add a compelling meta description (120-155 characters)');
      score -= 20;
    } else if (description.length < 120) {
      issues.push('Description too short');
      suggestions.push('Expand description to 120-155 characters');
      score -= 10;
    } else if (description.length > 155) {
      issues.push('Description too long');
      suggestions.push('Shorten description to under 155 characters');
      score -= 10;
    }

    // Content checks
    if (!content || content.length < 100) {
      issues.push('Insufficient content');
      suggestions.push('Add more descriptive content (aim for 300+ words for better SEO)');
      score -= 15;
    }

    // Keyword checks
    if (!keywords || keywords.length === 0) {
      issues.push('No keywords defined');
      suggestions.push('Research and add relevant keywords for your target audience');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
      issues,
      suggestions,
      passedChecks: 6 - issues.length,
      totalChecks: 6,
    };
  });

  // Generate structured data (JSON-LD)
  fastify.post('/generate-structured-data', async (request, reply) => {
    const { type, data } = request.body as {
      type: 'Person' | 'Organization' | 'Product' | 'Article' | 'LocalBusiness';
      data: Record<string, any>;
    };

    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': type,
    };

    let schema;

    switch (type) {
      case 'Person':
        schema = {
          ...baseSchema,
          name: data.name,
          url: data.url,
          description: data.description,
          ...(data.image ? { image: data.image } : {}),
          ...(data.jobTitle ? { jobTitle: data.jobTitle } : {}),
          ...(data.email ? { email: data.email } : {}),
        };
        break;

      case 'Organization':
        schema = {
          ...baseSchema,
          name: data.name,
          url: data.url,
          description: data.description,
          ...(data.logo ? { logo: data.logo } : {}),
          ...(data.address ? { address: data.address } : {}),
          ...(data.contactPoint ? { contactPoint: data.contactPoint } : {}),
        };
        break;

      case 'Product':
        schema = {
          ...baseSchema,
          name: data.name,
          description: data.description,
          ...(data.image ? { image: data.image } : {}),
          ...(data.offers ? { offers: data.offers } : {}),
          ...(data.brand ? { brand: data.brand } : {}),
        };
        break;

      default:
        schema = { ...baseSchema, ...data };
    }

    return {
      schema,
      html: `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`,
    };
  });
}
