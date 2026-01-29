import { FastifyInstance } from 'fastify';
import * as cheerio from 'cheerio';

export async function seoAnalyzerRoutes(fastify: FastifyInstance) {
  // Analyze any live URL
  fastify.post('/analyze-url', async (request, reply) => {
    const { url } = request.body as { url: string };

    if (!url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    try {
      // Fetch the page
      const response = await fetch(url);
      const html = await response.text();

      // Parse with cheerio
      const $ = cheerio.load(html);

      // Extract SEO elements
      const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const ogDescription = $('meta[property="og:description"]').attr('content') || '';
      const description = metaDescription || ogDescription || '';

      // Extract keywords
      const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map((k) => k.trim()) || [];

      // Get page content (first 1000 chars)
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1000);

      // Extract headings
      const h1Count = $('h1').length;
      const h1Text = $('h1').first().text();

      // Extract images
      const imgCount = $('img').length;
      const imgsWithoutAlt = $('img').filter((_, el) => !$(el).attr('alt')).length;

      // Extract links
      const internalLinks = $('a[href^="/"], a[href^="' + url + '"]').length;
      const externalLinks = $('a[href^="http"]').not('[href^="' + url + '"]').length;

      // Check for Open Graph tags
      const hasOgTags = $('meta[property^="og:"]').length > 0;
      const hasTwitterCard = $('meta[name^="twitter:"]').length > 0;

      // Check for structured data
      const hasStructuredData = $('script[type="application/ld+json"]').length > 0;

      // Run SEO audit
      const auditResponse = await fetch('http://localhost:3016/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          content: bodyText,
          keywords,
        }),
      });

      const audit = await auditResponse.json();

      // Additional checks
      const additionalIssues: string[] = [];
      const additionalSuggestions: string[] = [];

      if (h1Count === 0) {
        additionalIssues.push('No H1 heading found');
        additionalSuggestions.push('Add a main H1 heading to your page');
      } else if (h1Count > 1) {
        additionalIssues.push(`Multiple H1 headings found (${h1Count})`);
        additionalSuggestions.push('Use only one H1 heading per page');
      }

      if (imgsWithoutAlt > 0) {
        additionalIssues.push(`${imgsWithoutAlt} images missing alt text`);
        additionalSuggestions.push('Add descriptive alt text to all images for accessibility and SEO');
      }

      if (!hasOgTags) {
        additionalIssues.push('Missing Open Graph tags');
        additionalSuggestions.push('Add og:title, og:description, og:image for better social sharing');
      }

      if (!hasStructuredData) {
        additionalSuggestions.push('Add structured data (JSON-LD) for rich snippets in search results');
      }

      // Calculate enhanced score
      let enhancedScore = audit.score || 0;
      if (h1Count !== 1) enhancedScore -= 5;
      if (imgsWithoutAlt > 0) enhancedScore -= 10;
      if (!hasOgTags) enhancedScore -= 10;
      if (!hasStructuredData) enhancedScore -= 5;

      enhancedScore = Math.max(0, Math.min(100, enhancedScore));

      return {
        url,
        seo: {
          score: enhancedScore,
          grade:
            enhancedScore >= 90
              ? 'A'
              : enhancedScore >= 80
              ? 'B'
              : enhancedScore >= 70
              ? 'C'
              : enhancedScore >= 60
              ? 'D'
              : 'F',
          title: {
            value: title,
            length: title.length,
            optimal: title.length >= 30 && title.length <= 60,
          },
          description: {
            value: description,
            length: description.length,
            optimal: description.length >= 120 && description.length <= 155,
          },
          keywords: keywords.length > 0 ? keywords : null,
          issues: [...(audit.issues || []), ...additionalIssues],
          suggestions: [...(audit.suggestions || []), ...additionalSuggestions],
        },
        content: {
          h1: {
            count: h1Count,
            text: h1Text,
            optimal: h1Count === 1,
          },
          images: {
            total: imgCount,
            missingAlt: imgsWithoutAlt,
          },
          links: {
            internal: internalLinks,
            external: externalLinks,
          },
          wordCount: bodyText.split(/\s+/).length,
        },
        social: {
          hasOpenGraph: hasOgTags,
          hasTwitterCard: hasTwitterCard,
        },
        technical: {
          hasStructuredData,
          responseTime: response.headers.get('x-response-time') || 'N/A',
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to analyze URL',
        message: error.message,
        details: 'Make sure the URL is accessible and returns valid HTML',
      });
    }
  });

  // Batch analyze multiple competitor URLs
  fastify.post('/compare-competitors', async (request, reply) => {
    const { urls } = request.body as { urls: string[] };

    if (!urls || urls.length === 0) {
      return reply.status(400).send({ error: 'URLs array is required' });
    }

    if (urls.length > 5) {
      return reply.status(400).send({ error: 'Maximum 5 URLs allowed for comparison' });
    }

    try {
      const results = await Promise.all(
        urls.map(async (url) => {
          try {
            const analyzeResponse = await fetch('http://localhost:3016/seo/analyze-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url }),
            });

            if (!analyzeResponse.ok) {
              throw new Error(`Failed to analyze ${url}`);
            }

            return await analyzeResponse.json();
          } catch (error: any) {
            return {
              url,
              error: error.message,
              seo: { score: 0, grade: 'F' },
            };
          }
        })
      );

      // Sort by score
      results.sort((a, b) => (b.seo?.score || 0) - (a.seo?.score || 0));

      return {
        comparison: results.map((r) => ({
          url: r.url,
          score: r.seo?.score || 0,
          grade: r.seo?.grade || 'F',
          title: r.seo?.title?.value || 'N/A',
          hasIssues: (r.seo?.issues?.length || 0) > 0,
          error: r.error,
        })),
        winner: results[0]?.url,
        avgScore: results.reduce((sum, r) => sum + (r.seo?.score || 0), 0) / results.length,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to compare URLs', message: error.message });
    }
  });
}
