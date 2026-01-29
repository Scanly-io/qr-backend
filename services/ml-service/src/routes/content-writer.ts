import { FastifyInstance } from 'fastify';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function contentWriterRoutes(fastify: FastifyInstance) {
  // Generate bio/about text
  fastify.post('/generate-bio', async (request, reply) => {
    const { industry, tone, keywords, length } = request.body as {
      industry?: string;
      tone?: 'professional' | 'casual' | 'creative' | 'friendly';
      keywords?: string[];
      length?: 'short' | 'medium' | 'long';
    };

    const wordCount = length === 'short' ? 30 : length === 'long' ? 100 : 60;
    const keywordsText = keywords?.length ? ` Include these keywords naturally: ${keywords.join(', ')}.` : '';
    const industryText = industry ? ` This is for a ${industry} business.` : '';

    const prompt = `Write a compelling bio/about section for a microsite in a ${tone || 'professional'} tone. Keep it under ${wordCount} words.${industryText}${keywordsText} Make it engaging and authentic.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter specializing in creating engaging, concise bio content for landing pages and microsites.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const generatedText = completion.choices[0]?.message?.content || '';

      return {
        text: generatedText.trim(),
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate bio', message: error.message });
    }
  });

  // Generate headlines/titles
  fastify.post('/generate-headline', async (request, reply) => {
    const { topic, tone, context, count } = request.body as {
      topic: string;
      tone?: 'professional' | 'casual' | 'creative' | 'urgent' | 'friendly';
      context?: string;
      count?: number;
    };

    const numVariations = Math.min(count || 3, 5);
    const contextText = context ? ` Context: ${context}` : '';

    const prompt = `Generate ${numVariations} compelling headline variations for: "${topic}". Tone: ${tone || 'professional'}.${contextText} Make them attention-grabbing and clear. Return only the headlines, one per line.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert copywriter specializing in attention-grabbing headlines and titles.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const generatedText = completion.choices[0]?.message?.content || '';
      const headlines = generatedText
        .split('\n')
        .map((h) => h.replace(/^\d+\.\s*/, '').trim())
        .filter((h) => h.length > 0);

      return {
        headlines,
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate headlines', message: error.message });
    }
  });

  // Generate button text/CTA
  fastify.post('/generate-cta', async (request, reply) => {
    const { action, tone, context, count } = request.body as {
      action: string; // e.g., "sign up", "buy now", "learn more"
      tone?: 'urgent' | 'casual' | 'professional' | 'playful';
      context?: string;
      count?: number;
    };

    const numVariations = Math.min(count || 5, 10);
    const contextText = context ? ` Context: ${context}` : '';

    const prompt = `Generate ${numVariations} compelling call-to-action button text variations for: "${action}". Tone: ${tone || 'professional'}.${contextText} Keep each under 4 words. Make them action-oriented and persuasive. Return only the CTA text, one per line.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a conversion optimization expert specializing in persuasive call-to-action copy.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const generatedText = completion.choices[0]?.message?.content || '';
      const ctas = generatedText
        .split('\n')
        .map((c) => c.replace(/^\d+\.\s*/, '').replace(/['"]/g, '').trim())
        .filter((c) => c.length > 0);

      return {
        ctas,
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate CTAs', message: error.message });
    }
  });

  // Generate block description
  fastify.post('/generate-description', async (request, reply) => {
    const { topic, tone, length, keywords } = request.body as {
      topic: string;
      tone?: 'professional' | 'casual' | 'creative' | 'friendly';
      length?: 'short' | 'medium' | 'long';
      keywords?: string[];
    };

    const wordCount = length === 'short' ? 20 : length === 'long' ? 80 : 50;
    const keywordsText = keywords?.length ? ` Include: ${keywords.join(', ')}.` : '';

    const prompt = `Write a compelling description about: "${topic}". Tone: ${tone || 'professional'}. Keep it under ${wordCount} words.${keywordsText} Make it engaging and informative.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter specializing in concise, engaging product and service descriptions.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const generatedText = completion.choices[0]?.message?.content || '';

      return {
        text: generatedText.trim(),
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate description', message: error.message });
    }
  });

  // Improve existing text
  fastify.post('/improve-text', async (request, reply) => {
    const { text, goal, tone } = request.body as {
      text: string;
      goal?: 'clarity' | 'engagement' | 'conversion' | 'professionalism';
      tone?: string;
    };

    const goalMap = {
      clarity: 'Make it clearer and easier to understand',
      engagement: 'Make it more engaging and interesting',
      conversion: 'Make it more persuasive and action-oriented',
      professionalism: 'Make it more professional and polished',
    };

    const goalText = goal ? goalMap[goal] : 'Improve the overall quality';
    const toneText = tone ? ` Maintain a ${tone} tone.` : '';

    const prompt = `${goalText}.${toneText} Keep it concise.\n\nOriginal text: "${text}"`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional editor helping improve copy. Return only the improved text, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const improvedText = completion.choices[0]?.message?.content || text;

      return {
        original: text,
        improved: improvedText.trim(),
        usage: {
          tokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to improve text', message: error.message });
    }
  });
}
